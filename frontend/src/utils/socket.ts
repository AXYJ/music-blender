import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "./config";

// Une seule socket pour toute l'application, créée à la demande côté navigateur.
// autoConnect désactivé : GameProvider la connecte après avoir branché ses écouteurs.
let instance: Socket | null = null;

export const getSocket = (): Socket =>
  (instance ??= io(getSocketUrl(), {
    transports: ["polling", "websocket"],
    autoConnect: false,
  }));
