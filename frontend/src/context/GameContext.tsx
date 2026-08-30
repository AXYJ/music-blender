"use client";

// Import des modules
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { io, Socket } from "socket.io-client";

// Clé pour le localStorage
const PLAYER_NAME_KEY = "game_name";
const SFX_KEY = "game_sfx_volume";
const VOLUME_KEY = "game_volume";

// Import des types
import { View, GameContextType, Player } from "../types/game";
import { useSocketListeners } from "../utils/useSocketListeners";
import { getSocketUrl } from "../utils/config";
import { getSessionItem } from "../utils/storageUtils";
import { useTranslation } from "./LanguageContext";

// Création du contexte
const GameContext = createContext<GameContextType | undefined>(undefined);

// Création du provider
export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("game_code") || "";
    }
    return "";
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [volume, setVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VOLUME_KEY);
      return saved ? parseFloat(saved) : 0.05;
    }
    return 0.05;
  });
  const [musicAmount, setMusicAmount] = useState(3);
  const [time, setTime] = useState(30);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [toPlay, setToPlay] = useState<any[]>([]);
  const [database_artists, setDatabaseArtists] = useState<any[]>(() =>
    getSessionItem("database_artists", []),
  );
  const [database_tracks, setDatabaseTracks] = useState<any[]>(() =>
    getSessionItem("database_tracks", []),
  );
  const [message, setMessage] = useState("");

  const [turn, setTurn] = useState<number>(1);
  const [phase, setPhase] = useState<"guessing" | "answer" | "transition">(
    "guessing",
  );
  const [timeLeft, setTimeLeft] = useState<number>(30);

  // Pseudo du joueur
  const [name, setName] = useState("");

  const isPopStateRef = useRef(false);
  const currentViewRef = useRef<View>("home");

  // Enregistrement des écouteurs de socket
  useSocketListeners({
    socket,
    view,
    setView,
    setError,
    setRoomCode,
    setPlayers,
    setIsConnected,
    setName,
    setMusicAmount,
    setTime,
    playlistUrl,
    setToPlay,
    setDatabaseArtists,
    setDatabaseTracks,
    setTurn,
    setPhase,
    setTimeLeft,
    time,
    t,
  });

  // ----------------------------------------------------------------
  // Sauvegarde des volumes dans le localStorage quand ils changent
  // ----------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(VOLUME_KEY, volume.toString());
    }
  }, [volume]);

  // ----------------------------------------------------------------
  // Gestion du pseudo dans le localStorage
  // ----------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem(PLAYER_NAME_KEY);
      if (savedName) {
        setName(savedName);
      }
    }
  }, []);

  // ----------------------------------------------------------------
  // Connexion au serveur
  // ----------------------------------------------------------------
  useEffect(() => {
    // Création d'un ID de session pour pouvoir se reconnecter
    let id = localStorage.getItem("id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("id", id);
    }

    // Initialisation de la connexion
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      transports: ["polling", "websocket"],
    });

    setTimeout(() => {
      setSocket(newSocket);
      setIsConnected(newSocket.connected);
    }, 0);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ----------------------------------------------------------------
  // Sauvegarde du code de partie dans le sessionStorage
  // ----------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (roomCode) {
        sessionStorage.setItem("game_code", roomCode);
      } else {
        sessionStorage.removeItem("game_code");
      }
    }
  }, [roomCode]);

  // ----------------------------------------------------------------
  // Reconnexion automatique au serveur
  // ----------------------------------------------------------------
  useEffect(() => {
    if (socket && isConnected && roomCode && name) {
      const id = localStorage.getItem("id");
      socket.emit("join_game", roomCode, id, name);
    }
  }, [socket, isConnected, roomCode, name]);

  // ----------------------------------------------------------------
  // Actions de jeu (envoi au serveur)
  // ----------------------------------------------------------------

  // Création d'une partie
  const createGame = useCallback(() => {
    if (socket) {
      const id = localStorage.getItem("id");
      socket.emit("create_game", id, name);
      // Sauvegarde du pseudo uniquement au lancement de la partie
      localStorage.setItem(PLAYER_NAME_KEY, name);
    }
  }, [socket, name]);

  // Rejoindre une partie
  const joinGame = useCallback(
    (code: string) => {
      if (socket) {
        const id = localStorage.getItem("id");
        socket.emit("join_game", code, id, name);
        // Sauvegarde du pseudo uniquement au lancement de la partie
        localStorage.setItem(PLAYER_NAME_KEY, name);
      }
    },
    [socket, name],
  );

  // Prêt
  const beReady = useCallback(() => {
    if (socket) {
      const me = players.find((p) => p.socketId === socket.id);
      if (me) {
        socket.emit("ready", !me.isReady);
      }
    }
  }, [socket, players]);

  //Lancer une partie
  const launchGame = useCallback(() => {
    if (socket) {
      socket.emit("start_game");
    }
  }, [socket]);

  // Quitter une partie
  const quitGame = useCallback(() => {
    if (socket) {
      socket.emit("leave_game");
      setRoomCode("");
      setView("home");
    }
  }, [socket]);

  // Envoi des réponses aux serveur
  const sendAnswer = useCallback(
    (artist: string, track: string, turn: number) => {
      if (socket) {
        socket.emit("submit_answer", artist, track, turn);
      }
    },
    [socket],
  );

  // ----------------------------------------------------------------
  // Post Game
  // ----------------------------------------------------------------

  // Demande des résultats au serveur
  useEffect(() => {
    if (turn > toPlay.length && toPlay.length > 0 && socket) {
      socket.emit("get_final_scores");
      setView("result");
    }
  }, [turn, toPlay, socket]);

  // Relancer une partie
  const restart = useCallback(() => {
    if (socket) {
      socket.emit("restart_game");
      setView("lobby");
    }
  }, [socket]);

  // Initialisation de l'historique
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.history.state || !window.history.state.view) {
        window.history.replaceState({ view: "home" }, "");
      }
    }
  }, []);

  // Gestion des évènements PopState (bouton retour du navigateur)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      const targetView = (event.state?.view as View) || "home";
      const previousView = currentViewRef.current;

      isPopStateRef.current = true;

      if (previousView === "lobby" && targetView === "home") {
        quitGame();
      } else if (previousView === "game" && targetView === "home") {
        quitGame();
      } else if (previousView === "result" && targetView === "lobby") {
        restart();
      } else if (previousView === "mentions" && targetView === "home") {
        setView("home");
      } else {
        setView(targetView);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [quitGame, restart]);

  // Synchronisation de la vue actuelle avec l'historique
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prevView = currentViewRef.current;
    currentViewRef.current = view;

    // Si la transition vient d'un popstate, on ne modifie pas à nouveau l'historique
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }

    if (view === "home") {
      if (
        prevView === "lobby" ||
        prevView === "game" ||
        prevView === "mentions"
      ) {
        isPopStateRef.current = true;
        window.history.back();
      } else {
        window.history.replaceState({ view: "home" }, "");
      }
    } else if (view === "mentions") {
      window.history.pushState({ view: "mentions" }, "");
    } else if (view === "lobby") {
      if (prevView === "result") {
        isPopStateRef.current = true;
        window.history.back();
      } else {
        window.history.pushState({ view: "lobby" }, "");
      }
    } else if (view === "game") {
      window.history.replaceState({ view: "game" }, "");
    } else if (view === "result") {
      window.history.replaceState({ view: "lobby" }, "");
      window.history.pushState({ view: "result" }, "");
    }
  }, [view]);

  const value = useMemo(
    () => ({
      socket,
      view,
      setView,
      isConnected,
      error,
      setError,
      roomCode,
      setRoomCode,
      players,
      setPlayers,
      volume,
      setVolume,
      name,
      setName,
      createGame,
      joinGame,
      beReady,
      launchGame,
      sendAnswer,
      musicAmount,
      setMusicAmount,
      time,
      setTime,
      playlistUrl,
      toPlay,
      database_artists,
      database_tracks,
      setPlaylistUrl,
      setToPlay,
      setDatabaseArtists,
      setDatabaseTracks,
      message,
      setMessage,
      restart,
      turn,
      setTurn,
      phase,
      setPhase,
      timeLeft,
      setTimeLeft,
      quitGame,
    }),
    [
      socket,
      view,
      isConnected,
      error,
      roomCode,
      players,
      volume,
      name,
      createGame,
      joinGame,
      beReady,
      launchGame,
      sendAnswer,
      musicAmount,
      setMusicAmount,
      time,
      setTime,
      playlistUrl,
      toPlay,
      database_artists,
      database_tracks,
      setPlaylistUrl,
      setToPlay,
      setDatabaseArtists,
      setDatabaseTracks,
      message,
      setMessage,
      restart,
      turn,
      phase,
      timeLeft,
      quitGame,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// Hook personnalisé
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context)
    throw new Error("useGame doit être utilisé dans un GameProvider");
  return context;
};
