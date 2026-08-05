"use client"

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
import {
  View,
  GameContextType,
  Player,
} from "../types/game";
// import { useSocketListeners } from "../hooks/useSocketListeners";

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
  const [volume, setVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const sfxVolumeRef = useRef(sfxVolume);
  
  // Pseudo du joueur
  const [name, setName] = useState("");

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
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
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
// Actions de jeu (envoi au serveur)
// ----------------------------------------------------------------

  // Création d'une partie
  const createGame = useCallback(() => {
    if (socket) {
      const id = localStorage.getItem("id");
      socket.emit("create_game", socket.id, id);
      // Sauvegarde du pseudo uniquement au lancement de la partie
      localStorage.setItem(PLAYER_NAME_KEY, name);
    }
  }, [socket, name]);

  // Rejoindre une partie
  const joinGame = useCallback((code: string) => {
    if (socket) {
      const id = localStorage.getItem("id");
      socket.emit("join_game", code, socket.id, id);
      // Sauvegarde du pseudo uniquement au lancement de la partie
      localStorage.setItem(PLAYER_NAME_KEY, name);
    }
  }, [socket, name]);


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
    ]
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