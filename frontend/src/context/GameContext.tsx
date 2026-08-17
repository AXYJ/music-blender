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
import { useSocketListeners } from "../hooks/useSocketListeners";

// Création du contexte
const GameContext = createContext<GameContextType | undefined>(undefined);

// Création du provider
export const GameProvider = ({ children }: { children: ReactNode }) => {
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
  const [noMorePlayers, setNoMorePlayers] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VOLUME_KEY);
      return saved ? parseFloat(saved) : 0.1;
    }
    return 0.1;
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SFX_KEY);
      return saved ? parseFloat(saved) : 0.5;
    }
    return 0.5;
  });
  const [musicAmount, setMusicAmount] = useState(3);
  const [time, setTime] = useState(20);
  const sfxVolumeRef = useRef(sfxVolume);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [toPlay, setToPlay] = useState<any[]>([]);
  const [database_artists, setDatabaseArtists] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("database_artists");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error(
          "Error reading database_artists from sessionStorage during init:",
          e,
        );
      }
    }
    return [];
  });
  const [database_tracks, setDatabaseTracks] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("database_tracks");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error(
          "Error reading database_tracks from sessionStorage during init:",
          e,
        );
      }
    }
    return [];
  });
  const [message, setMessage] = useState("");

  const [turn, setTurn] = useState<number>(1);
  const [phase, setPhase] = useState<"guessing" | "answer" | "transition">(
    "guessing",
  );
  const [timeLeft, setTimeLeft] = useState<number>(20);

  // Pseudo du joueur
  const [name, setName] = useState("");

  // Enregistrement des écouteurs de socket
  useSocketListeners({
    socket,
    setView,
    setError,
    setRoomCode,
    setPlayers,
    setIsConnected,
    setNoMorePlayers,
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
  });

  // ----------------------------------------------------------------
  // Sauvegarde des volumes dans le localStorage quand ils changent
  // ----------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(VOLUME_KEY, volume.toString());
      localStorage.setItem(SFX_KEY, sfxVolume.toString());
    }
    sfxVolumeRef.current = sfxVolume;
  }, [volume, sfxVolume]);

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
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socketUrl =
      envUrl && envUrl !== "undefined" ? envUrl : "http://localhost:4000";
    console.log("Socket connection target URL:", socketUrl);
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
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
      console.log(
        `Tentative de reconnexion automatique à la room ${roomCode} avec l'ID ${id}`,
      );
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

  // Envoi des réponses aux serveur
  const sendAnswer = useCallback(
    (artist: string, track: string, turn: number) => {
      if (socket) {
        socket.emit("submit_answer", artist, track, turn);
      }
    },
    [socket],
  );

  // Relancer une partie
  const restart = useCallback(() => {
    console.log("restart");
    if (socket) {
      socket.emit("restart_game");
    }
  }, [socket]);

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
      noMorePlayers,
      setNoMorePlayers,
      players,
      setPlayers,
      volume,
      setVolume,
      sfxVolume,
      setSfxVolume,
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
    }),
    [
      socket,
      view,
      isConnected,
      error,
      noMorePlayers,
      roomCode,
      players,
      volume,
      sfxVolume,
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
