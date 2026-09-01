import React from "react";
import { Socket } from "socket.io-client";

// Définition des vues et phases
export type View = "home" | "lobby" | "game" | "result" | "mentions";
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
  // Actions
  createGame: () => void;
  joinGame: (code: string) => void;
  beReady: () => void;
  launchGame: () => void;

  // Volume
  volume: number;
  setVolume: (volume: number) => void;
  // Joueur
  name: string;
  setName: (name: string) => void;
  playerId: string;

  // Paramètres de partie
  musicAmount: number;
  setMusicAmount: (amount: number) => void;
  time: number;
  setTime: (time: number) => void;
  playlistUrl: string;
  setPlaylistUrl: React.Dispatch<React.SetStateAction<string>>;
  toPlay: any[];
  setToPlay: React.Dispatch<React.SetStateAction<any[]>>;
  database_artists: any[];
  setDatabaseArtists: React.Dispatch<React.SetStateAction<any[]>>;
  database_tracks: any[];
  setDatabaseTracks: React.Dispatch<React.SetStateAction<any[]>>;
  sendAnswer: (artist: string, track: string, turn: number) => void;
  quitGame: () => void;
  message: string;
  setMessage: (message: string) => void;
  restart: () => void;
  turn: number;
  setTurn: React.Dispatch<React.SetStateAction<number>>;
  phase: "guessing" | "answer" | "transition";
  setPhase: React.Dispatch<
    React.SetStateAction<"guessing" | "answer" | "transition">
  >;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
}

// Types pour les joueurs
export interface Player {
  id: string;
  socketId?: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  leavedPlayer: boolean;
  playlistUrl?: string;
  tracks?: any[];
  artist_answer: boolean;
  artist_score?: number;
  track_answer: boolean;
  artists_final_board?: Record<number, string>;
  tracks_final_board?: Record<number, string>;
  artists_scores_board?: Record<number, number>;
  tracks_scores_board?: Record<number, boolean>;
}
