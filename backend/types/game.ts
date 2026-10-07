export interface Track {
  order?: number;
  name: string;
  artist: string;
  internationalName?: string;
  internationalArtist?: string;
  previewUrl?: string;
  imageUrl?: string | null;
  submittedBy?: string;
  url?: string;
  _normalizedName?: string;
  _normalizedIntName?: string;
  _requiredArtists?: string[][];
  _rawArtist?: string;
  _rawIntArtist?: string;
}

// Marque de type uniquement : sans elle, un Track complet serait accepté partout où l'on
// attend un PublicTrack (il en a tous les champs).
declare const publicTrackBrand: unique symbol;

// Morceau tel que vu par les clients : sans les champs internes de correction des
// réponses (_normalizedName, _requiredArtists…), qui restent sur le serveur. Seule
// toPublicTracks (servor.ts) en fabrique.
export type PublicTrack = Omit<
  Track,
  | "_normalizedName"
  | "_normalizedIntName"
  | "_requiredArtists"
  | "_rawArtist"
  | "_rawIntArtist"
> & { readonly [publicTrackBrand]: true };

// Morceau tel que renvoyé par une plateforme (Spotify, Deezer, Apple Music)
export interface PlatformTrack {
  name: string;
  artist: string;
  previewUrl: string;
  imageUrl: string;
  url: string;
}

export interface DatabaseArtist {
  id?: string;
  artist: string;
  internationalArtist?: string;
}

export interface DatabaseTrack {
  id?: string;
  name: string;
  internationalName?: string;
}

export interface Player {
  // Secret : sert à reprendre sa place après une reconnexion. Ne JAMAIS l'envoyer aux
  // autres joueurs (voir toPublicPlayers dans servor.ts).
  id: string;
  // Identifiant montré aux autres joueurs, tiré au hasard à l'arrivée dans la room
  publicId: string;
  socketId?: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  leavedPlayer: boolean;
  inLobby?: boolean;
  playlistUrl?: string;
  tracks?: Track[];
  artists_final_board?: Record<number, string>;
  tracks_final_board?: Record<number, string>;
  artists_scores_board?: Record<number, number>;
  tracks_scores_board?: Record<number, boolean>;
}

// Marque de type uniquement (aucune trace à l'exécution) : sans elle, un Player complet
// serait accepté partout où l'on attend un PublicPlayer, puisqu'il en a tous les champs.
declare const publicBrand: unique symbol;

// Joueur tel que vu par les clients : `id` est le publicId, et ce qui est interne au
// serveur (lien de playlist, morceaux, état du lobby) n'est pas envoyé. Seule
// toPublicPlayers (servor.ts) en fabrique.
export type PublicPlayer = Omit<
  Player,
  "id" | "publicId" | "playlistUrl" | "tracks" | "inLobby"
> & { id: string; readonly [publicBrand]: true };

// Horloge de partie : gameStartTime et serverNow sont des heures serveur (ms epoch)
export interface GameTiming {
  gameStartTime: number;
  serverNow: number;
  time: number;
}

export interface Room {
  players: Player[];
  musicAmount: number;
  time: number;
  toPlay: Track[];
  database_artists: DatabaseArtist[];
  database_tracks: DatabaseTrack[];
  gameStartTime?: number | null;
  isLoadingTracks?: boolean;
  isGameOver?: boolean;
  cleanupTimeout?: NodeJS.Timeout;
}

export interface ClientToServerEvents {
  create_game: (id: string, name: string) => void;
  join_game: (code: string, id: string, name: string) => void;
  ready: (isReady: boolean) => void;
  music_amount: (amount: number) => void;
  time: (time: number) => void;
  start_game: () => void;
  send_playlist_url: (url: string) => void;
  submit_answer: (artist: string, track: string, turn: number) => void;
  get_final_scores: () => void;
  restart_game: () => void;
  leave_game: () => void;
}

export interface ServerToClientEvents {
  room_created: (roomCode: string, players: PublicPlayer[]) => void;
  room_updated: (roomCode: string, players: PublicPlayer[]) => void;
  game_started: (players: PublicPlayer[]) => void;
  data_loaded: (
    toPlay: PublicTrack[],
    database_artists: DatabaseArtist[],
    database_tracks: DatabaseTrack[],
    timing: GameTiming,
  ) => void;
  "game-setting": (key: string, value: number) => void;
  answer: (
    name: string,
    artist_answer: boolean | number,
    track_answer: boolean,
  ) => void;
  final_scores: (players: PublicPlayer[]) => void;
  no_playlist: (reason?: string) => void;
  game_reset: (
    rules: { musicAmount: number; time: number },
    players: PublicPlayer[],
  ) => void;
  game_reconnected: (data: {
    toPlay: PublicTrack[];
    database_artists: DatabaseArtist[];
    database_tracks: DatabaseTrack[];
    turn: number;
    phase: "guessing" | "answer" | "transition";
    timeLeft: number;
    time: number;
    timing: GameTiming;
  }) => void;
  error: (error: string) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  playerId?: string;
  roomCode?: string;
}
