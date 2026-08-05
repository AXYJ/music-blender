import React from "react";
import { Socket } from "socket.io-client";

// Définition des vues et phases
export type View = "home" | "lobby" | "game" | "final";
export type Phase = "hide-answer" | "show-answer";

// Toutes les variables globales du jeu
// Utilisation de variables globales pour éviter de passer des props à chaque composant
export interface GameContextType {
    // Connexion
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  // Vue actuelle
  view: View;
  setView: (view: View) => void;
  // Partie
  roomCode: string;
  setRoomCode: (code: string) => void;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  noMorePlayers: boolean;
  setNoMorePlayers: React.Dispatch<React.SetStateAction<boolean>>;
    // Actions
  createGame: () => void;
  joinGame: (code: string) => void;

    // Volume
  volume: number;
  setVolume: (volume: number) => void;
  sfxVolume: number;
  setSfxVolume: (sfxVolume: number) => void;
  // Joueur
  name: string;
  setName: (name: string) => void;
}

// Types pour les joueurs
export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  leavedPlayer: boolean;
}
