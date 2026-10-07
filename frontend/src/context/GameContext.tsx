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
  useSyncExternalStore,
} from "react";
import type { Socket } from "socket.io-client";

// Clé pour le localStorage
const PLAYER_NAME_KEY = "game_name";
const VOLUME_KEY = "game_volume";

// Durée d'affichage des messages et des erreurs
const ALERT_DURATION = 2000;

// Import des types
import {
  View,
  GamePhase,
  GameClock,
  GameContextType,
  Player,
  Track,
  DatabaseArtist,
  DatabaseTrack,
} from "../types/game";
import { useSocketListeners } from "../utils/useSocketListeners";
import { getSocket } from "../utils/socket";
import { getSessionItem } from "../utils/storageUtils";
import {
  readLocal,
  subscribeNever,
  useLocalValue,
  writeLocal,
} from "../utils/useLocalStorage";
import { useTranslation } from "./LanguageContext";

// Création du contexte
const GameContext = createContext<GameContextType | undefined>(undefined);

// Création du provider
export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  // null côté serveur et pendant l'hydratation, la socket partagée ensuite
  const socket = useSyncExternalStore<Socket | null>(
    subscribeNever,
    getSocket,
    () => null,
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [roomCode, setRoomCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("game_code") || "";
    }
    return "";
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VOLUME_KEY);
      return saved ? parseFloat(saved) : 0.05;
    }
    return 0.05;
  });
  const [musicAmount, setMusicAmount] = useState<number>(3);
  const [time, setTime] = useState<number>(30);
  const [playlistUrl, setPlaylistUrl] = useState<string>("");
  const [toPlay, setToPlay] = useState<Track[]>([]);
  const [database_artists, setDatabaseArtists] = useState<DatabaseArtist[]>(
    () => getSessionItem<DatabaseArtist[]>("database_artists", []),
  );
  const [database_tracks, setDatabaseTracks] = useState<DatabaseTrack[]>(() =>
    getSessionItem<DatabaseTrack[]>("database_tracks", []),
  );
  const [message, setMessage] = useState<string>("");

  const [turn, setTurn] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>("guessing");
  const [gameClock, setGameClock] = useState<GameClock | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);

  // Pseudo : celui saisi pendant la session, sinon celui sauvegardé dans localStorage
  const savedName = useLocalValue(PLAYER_NAME_KEY);
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? savedName;
  // Mon identifiant public dans la room, appris du serveur (voir rememberMe). L'id secret
  // de reconnexion reste dans localStorage et n'est lu que pour create_game / join_game.
  const [playerId, setPlayerId] = useState<string>("");

  const isPopStateRef = useRef<boolean>(false);
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
    setGameClock,
    time,
    t,
    setPlayerId,
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
  // Les erreurs et les messages disparaissent seuls
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ALERT_DURATION);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), ALERT_DURATION);
    return () => clearTimeout(timer);
  }, [message]);

  // ----------------------------------------------------------------
  // Connexion au serveur
  // ----------------------------------------------------------------
  useEffect(() => {
    // Création d'un ID de session pour pouvoir se reconnecter
    if (!readLocal("id")) {
      writeLocal("id", crypto.randomUUID());
    }

    // Connexion : les écouteurs de useSocketListeners sont déjà branchés
    if (!socket) return;
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

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
  // Une seule fois par connexion (nouvelle socket.id) : modifier le pseudo ou le code
  // ne doit pas renvoyer join_game, createGame/joinGame émettent déjà le leur.
  const joinedSocketRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      socket &&
      isConnected &&
      roomCode &&
      name &&
      joinedSocketRef.current !== socket.id
    ) {
      joinedSocketRef.current = socket.id;
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
      writeLocal(PLAYER_NAME_KEY, name);
    }
  }, [socket, name]);

  // Rejoindre une partie
  const joinGame = useCallback(
    (code: string) => {
      if (socket) {
        const id = localStorage.getItem("id");
        socket.emit("join_game", code, id, name);
        // Sauvegarde du pseudo uniquement au lancement de la partie
        writeLocal(PLAYER_NAME_KEY, name);
      }
    },
    [socket, name],
  );

  // Prêt
  const beReady = useCallback(() => {
    if (socket) {
      const me = players.find(
        (p) => (playerId && p.id === playerId) || p.socketId === socket.id,
      );
      if (me) {
        socket.emit("ready", !me.isReady);
      }
    }
  }, [socket, players, playerId]);

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
        // Pas de history.back() : après un rechargement l'entrée précédente peut
        // être "home", ce qui ferait repasser par l'accueil
        window.history.replaceState({ view: "lobby" }, "");
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
      playerId,
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
      gameClock,
      setGameClock,
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
      playerId,
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
      gameClock,
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
