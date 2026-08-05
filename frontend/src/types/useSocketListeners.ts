import { Socket } from "socket.io-client";
import { useEffect, RefObject, Dispatch, SetStateAction } from "react";
import { Player, View } from "../types/game";

// Clé pour le localStorage
const PLAYER_NAME_KEY = "name";

interface SocketListenersProps {
  socket: Socket | null;
  setView: (view: View) => void;
  setError: (error: string | null) => void;
  setRoomCode: (code: string) => void;
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  setIsConnected: (connected: boolean) => void;
  setNoMorePlayers: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useSocketListeners = (props: SocketListenersProps) => {
  const {
    socket,
    setView,
    setError,
    setRoomCode,
    setPlayers,
    setIsConnected,
    setNoMorePlayers,
  } = props;

  useEffect(() => {
    if (!socket) return;

    // Keep-alive pour éviter que le serveur (ex: Render) ne mette le socket en veille
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
    const keepAliveInterval = setInterval(
      () => {
        fetch(socketUrl).catch((err) =>
          console.error("Erreur keep-alive", err)
        );
      },
      5 * 60 * 1000
    );

    // ----------------
    // Connexion & Cycle de vie
    // ----------------
    socket.on("connect", () => {
      console.log("Connecté au serveur ! ID:", socket.id);
      setIsConnected(true);
    });

    socket.on("connect_error", (err) => {
      console.error("Erreur de connexion socket:", err);
      setError("Erreur de connexion serveur");
      setIsConnected(false);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket déconnecté:", reason);
      setIsConnected(false);
      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        setView("home");
        setError("Vous avez été déconnecté du serveur.");
      }
    });
  });

}