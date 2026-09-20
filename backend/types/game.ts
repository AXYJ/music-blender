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

export interface PlayerAnswer {
  artist: string;
  track: string;
  artist_correct: boolean;
  artist_score: number;
  track_correct: boolean;
}

export interface Player {
  id: string;
  socketId?: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  leavedPlayer: boolean;
  inLobby?: boolean;
  playlistUrl?: string;
  tracks?: Track[];
  artist_answer?: boolean;
  artist_score?: number;
  track_answer?: boolean;
  artists_final_board?: Record<number, string>;
  tracks_final_board?: Record<number, string>;
  artists_scores_board?: Record<number, number>;
  tracks_scores_board?: Record<number, boolean>;
  disconnectTimeout?: NodeJS.Timeout;
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
  leavedPlayers?: Player[];
  answers?: Record<string, PlayerAnswer>;
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
  room_created: (roomCode: string, players: Player[]) => void;
  room_updated: (roomCode: string, players: Player[]) => void;
  game_started: (players: Player[]) => void;
  data_loaded: (
    toPlay: Track[],
    database_artists: DatabaseArtist[],
    database_tracks: DatabaseTrack[],
  ) => void;
  "game-setting": (key: string, value: number) => void;
  answer: (
    name: string,
    artist_answer: boolean | number,
    track_answer: boolean,
  ) => void;
  final_scores: (players: Player[]) => void;
  no_playlist: (reason?: string) => void;
  game_reset: (
    rules: { musicAmount: number; time: number },
    players: Player[],
  ) => void;
  game_reconnected: (data: {
    toPlay: Track[];
    database_artists: DatabaseArtist[];
    database_tracks: DatabaseTrack[];
    turn: number;
    phase: "guessing" | "answer" | "transition";
    timeLeft: number;
    time: number;
  }) => void;
  error: (error: string) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  playerId?: string;
  roomCode?: string;
}
