import { Socket } from "socket.io-client";
import { useEffect } from "react";
import { Player, View } from "../types/game";

interface SocketListenersProps {
  socket: Socket | null;
  setView: (view: View) => void;
  setError: (error: string | null) => void;
  setRoomCode: (code: string) => void;
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  setIsConnected: (connected: boolean) => void;
  setNoMorePlayers: React.Dispatch<React.SetStateAction<boolean>>;
  setName: (name: string) => void;
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
    setName,
  } = props;

  useEffect(() => {
    if (!socket) return;

    // Keep-alive pour éviter que le serveur (ex: Render) ne mette le socket en veille
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socketUrl = envUrl && envUrl !== "undefined" ? envUrl : "http://localhost:4000";
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
    const handleConnect = () => {
      console.log("Connecté au serveur ! ID:", socket.id);
      setIsConnected(true);
    };

    const handleConnectError = (err: Error) => {
      console.error("Erreur de connexion socket:", err);
      setError("Erreur de connexion serveur");
      setIsConnected(false);
    };

    const handleDisconnect = (reason: string) => {
      console.log("Socket déconnecté:", reason);
      setIsConnected(false);
      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        setView("home");
        setError("Vous avez été déconnecté du serveur.");
      }
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);

    // ----------------
    // Gestion des erreurs
    // ----------------
    const handleError = (error: string) => {
      setError(error);
    };
    socket.on("error", handleError);

    // ----------------
    // Gestion des parties
    // ----------------
    const handleRoomCreated = (roomCode: string, players: any[]) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setView("lobby");
      const me = players.find((p: any) => p.socketId === socket.id);
      if (me) {
        setName(me.name);
      }
    };

    const handleRoomUpdated = (roomCode: string, players: any[]) => {
      console.log("Room updated:", roomCode);
      console.log("Players", players);
      setView("lobby");
      setPlayers(players);
      setRoomCode(roomCode)
    };

    socket.on("room_created", handleRoomCreated);
    socket.on("room_updated", handleRoomUpdated);

    return () => {
      clearInterval(keepAliveInterval);
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("error", handleError);
      socket.off("room_created", handleRoomCreated);
      socket.off("room_updated", handleRoomUpdated);
    };
  }, [socket, setView, setError, setIsConnected, setRoomCode, setPlayers, setName]);
};
