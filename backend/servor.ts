import process from "process";
import crypto from "crypto";

// Charge backend/.env (Node 20.12+). Les modules importés ne doivent donc pas lire
// process.env à leur chargement. Optionnel en production si les variables sont
// définies dans le système.
try {
  process.loadEnvFile?.();
} catch {
  // pas de fichier .env
}

import express, { Request, Response } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import selectTracks, {
  getInternationalName,
} from "./scripts/get-artists-tracks.js";
import { transliterateArtists } from "./scripts/transliterate.js";
import {
  Track,
  Room,
  Player,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  GameTiming,
  DatabaseArtist,
  DatabaseTrack,
} from "./types/game.js";

// Initialisation
const app = express();
app.use(cors());

// Route de base pour vérifier que le serveur fonctionne
app.get("/", (_req: Request, res: Response) => {
  res.send("Music Blender Server is running");
});

const server = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  // Serveur volontairement ouvert : pas de cookie ni de compte, et CORS ne
  // s'applique de toute façon pas au transport WebSocket.
  cors: { origin: true, methods: ["GET", "POST"] },
  transports: ["polling", "websocket"],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// ----------------
// Démarrage du serveur
// ----------------

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// ----------------
// Gestion des connexions
// ----------------

// Stockage des parties
const rooms: Record<string, Room> = {};

// Minuteurs de déconnexion, gardés hors de Player : un Timeout est circulaire
// et ferait planter socket.io quand room.players est envoyé aux clients.
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

function clearDisconnectTimeout(playerId: string): void {
  clearTimeout(disconnectTimeouts.get(playerId));
  disconnectTimeouts.delete(playerId);
}

function getSocketContext(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
): { roomCode?: string; room?: Room; player?: Player } {
  let roomCode = socket.data.roomCode;
  if (!roomCode || !rooms[roomCode]) {
    roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
  }
  if (!roomCode || !rooms[roomCode]) {
    for (const code in rooms) {
      const p = rooms[code].players.find(
        (x) =>
          x.socketId === socket.id ||
          (socket.data.playerId && x.id === socket.data.playerId),
      );
      if (p) {
        roomCode = code;
        socket.data.roomCode = code;
        socket.data.playerId = p.id;
        return { roomCode, room: rooms[code], player: p };
      }
    }
    return {};
  }
  const room = rooms[roomCode];
  const playerId = socket.data.playerId;
  const player = room.players.find(
    (p) => (playerId && p.id === playerId) || p.socketId === socket.id,
  );
  return { roomCode, room, player };
}

io.on(
  "connection",
  (
    socket: Socket<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >,
  ) => {
    console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);

    // --------------------------------------------------------
    // Création d'une partie
    // --------------------------------------------------------
    socket.on("create_game", (id: string, name: string) => {
      let roomCode: string;
      do {
        roomCode = crypto.randomUUID().slice(0, 6).toUpperCase();
      } while (rooms[roomCode]);
      socket.data.roomCode = roomCode;
      socket.data.playerId = id;
      rooms[roomCode] = {
        players: [
          {
            name: name,
            id: id,
            socketId: socket.id,
            isHost: true,
            leavedPlayer: false,
            inLobby: true,
            score: 0,
            isReady: true,
          },
        ],
        musicAmount: 3,
        time: 30,
        toPlay: [],
        database_artists: [],
        database_tracks: [],
      };
      socket.join(roomCode);
      socket.emit("room_created", roomCode, rooms[roomCode].players);
    });

    // --------------------------------------------------------
    // Rejoindre une partie
    // --------------------------------------------------------
    socket.on("join_game", (roomCode: string, id: string, name: string) => {
      const room = rooms[roomCode];
      if (!room) {
        socket.emit("error", "room_not_found");
        return;
      }

      // Un joueur qui revient reprend sa place même si la room est pleine
      let player = room.players.find((p) => p.id === id);
      if (!player && room.players.length >= 12) {
        socket.emit("error", "room_full");
        return;
      }
      socket.data.roomCode = roomCode;
      socket.data.playerId = id;

      const gameActive = hasActiveGame(room);
      if (player) {
        player.socketId = socket.id;
        player.leavedPlayer = false;
        player.inLobby = !gameActive;
        clearDisconnectTimeout(player.id);
        if (room.cleanupTimeout) {
          clearTimeout(room.cleanupTimeout);
          delete room.cleanupTimeout;
        }
        console.log(
          `[${new Date().toISOString()}] User ${socket.id} (${player.name}) reconnected to room ${roomCode}`,
        );
      } else {
        room.players.push({
          name: name,
          id: id,
          socketId: socket.id,
          isHost: false,
          leavedPlayer: false,
          inLobby: !gameActive,
          score: 0,
          isReady: false,
        });
        console.log(
          `[${new Date().toISOString()}] User ${socket.id} joined room ${roomCode}`,
        );
      }
      socket.join(roomCode);
      io.to(roomCode).emit("room_updated", roomCode, room.players);

      // Synchroniser les paramètres de la partie
      socket.emit("game-setting", "music_amount", room.musicAmount);
      socket.emit("game-setting", "time", room.time);

      // Partie en cours (ou résultats affichés) : renvoyer l'état pour rejoindre l'écran de jeu
      if (gameActive && room.gameStartTime) {
        socket.emit("game_reconnected", {
          toPlay: room.toPlay,
          database_artists: room.database_artists,
          database_tracks: room.database_tracks,
          ...getTurnInfo(room.time, room.gameStartTime, room.toPlay.length),
          time: room.time,
          timing: getGameTiming(room.time, room.gameStartTime),
        });
      }
    });

  // Quitter une partie
  socket.on("leave_game", () => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player) return;

    delete socket.data.roomCode;
    clearDisconnectTimeout(player.id);
    player.leavedPlayer = true;
    room.players = room.players.filter((p) => p.id !== player.id);
    console.log(
      `[${new Date().toISOString()}] User ${player.name} left room ${roomCode}`,
    );
    socket.leave(roomCode);

    // Si l'hôte part (lobby, partie ou résultats), un autre joueur devient hôte :
    // sans hôte, personne ne pourrait relancer une partie
    if (player.isHost) {
      const newHost =
        room.players.find((p) => !p.leavedPlayer) || room.players[0];
      if (newHost) {
        newHost.isHost = true;
        newHost.isReady = true;
      }
    }

    // Si plus aucun joueur dans la room, on supprime la room
    if (room.players.length === 0) {
      if (room.cleanupTimeout) {
        clearTimeout(room.cleanupTimeout);
      }
      delete rooms[roomCode];
      console.log(
        `[${new Date().toISOString()}] Room ${roomCode} deleted because it is empty`,
      );
    } else {
      io.to(roomCode).emit("room_updated", roomCode, room.players);
      checkAndResetGame(roomCode);
    }
  });

  // Prêt
  socket.on("ready", (isReady: boolean) => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player) return;
    player.isReady = isReady;
    io.to(roomCode).emit("room_updated", roomCode, room.players);
  });

  // Lancement de la partie
  socket.on("start_game", () => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player?.isHost) return;

    // Réinitialiser la propriété playlistUrl de tous les joueurs à undefined pour pouvoir suivre les retours
    room.players.forEach((p) => {
      p.playlistUrl = undefined;
      p.inLobby = false;
      p.isReady = p.isHost;
      p.score = 0;
      p.artists_final_board = {};
      p.tracks_final_board = {};
      p.artists_scores_board = {};
      p.tracks_scores_board = {};
      p.leavedPlayer = false;
    });
    room.isGameOver = false;
    room.gameStartTime = null;
    room.isLoadingTracks = false;
    io.to(roomCode).emit("game_started", room.players);
  });

  // Ajout des autres playlist
  socket.on("send_playlist_url", async (playlistUrl: string) => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player) return;
    player.playlistUrl = playlistUrl || "";

    // On attend que tous les joueurs aient répondu (url ou chaîne vide),
    // et un seul chargement à la fois
    const allSubmitted = room.players.every((p) => p.playlistUrl !== undefined);
    if (!allSubmitted || room.isLoadingTracks) return;

    room.isLoadingTracks = true;
    room.toPlay = [];

    try {
      const { allTracks, selected, hasError } = await loadPlayersTracks(
        room,
        roomCode,
      );
      room.toPlay = selected;

      if (hasError || allTracks.length < 1) {
        room.isLoadingTracks = false;
        if (allTracks.length < 1 && !hasError) {
          io.to(roomCode).emit("no_playlist", "no_playlist_tracks");
        }
        return;
      }

      const { databaseTracks, artistNames } = collectDatabases(allTracks);
      room.database_tracks = databaseTracks;
      room.database_artists = await buildArtistDatabase(artistNames);

      // Ordre aléatoire global, avec les normalisations précalculées
      room.toPlay = shuffle(room.toPlay).map(prepareTrack);
      room.gameStartTime = Date.now();
      room.isLoadingTracks = false;
      io.to(roomCode).emit(
        "data_loaded",
        room.toPlay,
        room.database_artists,
        room.database_tracks,
        getGameTiming(room.time, room.gameStartTime),
      );
    } catch (processingErr) {
      room.isLoadingTracks = false;
      socket.emit("error", "internal_error");
    }
  });

  // --------------------------------------------------------
  // Paramètres de partie
  // --------------------------------------------------------

  // Musique par playlist
  socket.on("music_amount", (amount: number) => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player?.isHost) return;
    if (!Number.isInteger(amount) || amount < 1 || amount > 30) return;
    room.musicAmount = amount;
    io.to(roomCode).emit("game-setting", "music_amount", amount);
  });

  // Temps
  socket.on("time", (time: number) => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player?.isHost) return;
    if (!Number.isInteger(time) || time < 5 || time > 30 || time % 5 !== 0) return;
    room.time = time;
    io.to(roomCode).emit("game-setting", "time", time);
  });

  // --------------------------------------------------------
  // Actions en partie
  // --------------------------------------------------------

  // Envoi de la réponse (optimisé avec précalculs)
  socket.on("submit_answer", (artist: string, track: string, turn: number) => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player) return;

    // Le tour est calculé côté serveur : le `turn` du client n'est pas fiable
    if (!room.gameStartTime || turn !== getTurnInfo(room.time, room.gameStartTime, room.toPlay.length).turn)
      return;
    // Une seule réponse par joueur et par tour
    if (player.tracks_scores_board?.[turn - 1] !== undefined) return;

    const currentTrack = room.toPlay[turn - 1];
    if (currentTrack) {
      const trackGuess = normalizeString(track);
      const correctTrack =
        currentTrack._normalizedName ?? normalizeString(currentTrack.name);
      const correctIntTrack =
        currentTrack._normalizedIntName ??
        normalizeString(currentTrack.internationalName || "");

      // Découper et normaliser les réponses de l'artiste saisies par le joueur
      const playerGuesses = (artist || "")
        .split(",")
        .map((a) => normalizeString(a))
        .filter(Boolean);

      const requiredArtists = currentTrack._requiredArtists ?? [];

      let artist_score = 0;
      if (requiredArtists.length > 0) {
        let matchedCount = 0;
        for (const acceptableNames of requiredArtists) {
          const isGuessed = playerGuesses.some((guess) =>
            acceptableNames.includes(guess),
          );
          if (isGuessed) {
            matchedCount++;
          }
        }
        if (matchedCount === requiredArtists.length) {
          artist_score = 1;
        } else if (matchedCount > 0) {
          artist_score = 0.5;
        }
      } else {
        const rawArtist =
          currentTrack._rawArtist ?? normalizeString(currentTrack.artist);
        const rawIntArtist =
          currentTrack._rawIntArtist ??
          normalizeString(currentTrack.internationalArtist || "");
        if (
          playerGuesses.some(
            (guess) => guess === rawArtist || guess === rawIntArtist,
          )
        ) {
          artist_score = 1;
        }
      }

      const track_answer =
        trackGuess === correctTrack || trackGuess === correctIntTrack;

      player.artists_final_board = player.artists_final_board || {};
      player.tracks_final_board = player.tracks_final_board || {};
      const cleanArtist = (artist || "").trim().replace(/,$/, "").trim();
      player.artists_final_board[turn - 1] = cleanArtist;
      player.tracks_final_board[turn - 1] = track || "";

      player.artists_scores_board = player.artists_scores_board || {};
      player.tracks_scores_board = player.tracks_scores_board || {};
      player.artists_scores_board[turn - 1] = artist_score;
      player.tracks_scores_board[turn - 1] = track_answer;

      // Calcul et mise à jour du score sur le serveur
      let additionalScore = artist_score;
      if (track_answer) {
        additionalScore += 1;
      }
      player.score = (player.score || 0) + additionalScore;

      io.to(roomCode).emit(
        "answer",
        player.name,
        artist_score,
        track_answer,
      );
    }
  });

  // --------------------------------------------------------
  // Post game
  // --------------------------------------------------------

  // Demande des scores finaux
  socket.on("get_final_scores", () => {
    const { room } = getSocketContext(socket);
    if (room) {
      socket.emit("final_scores", room.players);
    }
  });

  // Retour au lobby
  socket.on("restart_game", () => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (roomCode && room && player) {
      player.inLobby = true;
      player.isReady = player.isHost;
      room.isGameOver = true;
      io.to(roomCode).emit("room_updated", roomCode, room.players);
      checkAndResetGame(roomCode);
    }
  });

  const GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes de délai de grâce

  socket.on("disconnect", () => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player) return;

    // Socket périmée : le joueur s'est déjà reconnecté avec une autre socket (retour
    // d'une autre appli sur mobile). Cette déconnexion tardive ne doit pas compter.
    if (player.socketId !== socket.id) return;

    // Marquer le joueur comme temporairement déconnecté
    player.leavedPlayer = true;

    const activePlayers = room.players.filter((p) => !p.leavedPlayer);

    if (activePlayers.length === 0) {
      // Tous les joueurs sont déconnectés : on démarre le timer de suppression de la room
      console.log(
        `[${new Date().toISOString()}] All players in room ${roomCode} disconnected. Starting 5min cleanup timer.`,
      );
      if (!room.cleanupTimeout) {
        room.cleanupTimeout = setTimeout(() => {
          const currentRoom = rooms[roomCode];
          if (
            currentRoom &&
            currentRoom.players.every((p) => p.leavedPlayer)
          ) {
            delete rooms[roomCode];
            console.log(
              `[${new Date().toISOString()}] Room ${roomCode} deleted after 5min grace period expiration`,
            );
          }
        }, GRACE_PERIOD);
      }
    } else {
      // D'autres joueurs sont encore connectés
      if (player.isHost) {
        // L'hôte s'est déconnecté : donner 5 minutes avant de transférer l'hôte
        clearDisconnectTimeout(player.id);
        disconnectTimeouts.set(player.id, setTimeout(() => {
          disconnectTimeouts.delete(player.id);
          const currentRoom = rooms[roomCode];
          if (currentRoom) {
            const currentHost = currentRoom.players.find(
              (p) => p.id === player.id,
            );
            if (
              currentHost &&
              currentHost.leavedPlayer &&
              currentHost.isHost
            ) {
              const nextHost = currentRoom.players.find(
                (p) => !p.leavedPlayer,
              );
              if (nextHost) {
                currentHost.isHost = false;
                nextHost.isHost = true;
                nextHost.isReady = true;
                console.log(
                  `[${new Date().toISOString()}] Host transferred to ${nextHost.name} in room ${roomCode} after 5min timeout`,
                );
                io.to(roomCode).emit(
                  "room_updated",
                  roomCode,
                  currentRoom.players,
                );
              }
            }
          }
        }, GRACE_PERIOD));
      } else if (!isGameRunning(room)) {
        // Joueur non-hôte dans le lobby : le retirer s'il ne revient pas après 5 minutes
        clearDisconnectTimeout(player.id);
        disconnectTimeouts.set(player.id, setTimeout(() => {
          disconnectTimeouts.delete(player.id);
          const currentRoom = rooms[roomCode];
          if (currentRoom) {
            const p = currentRoom.players.find((x) => x.id === player.id);
            if (p && p.leavedPlayer) {
              currentRoom.players = currentRoom.players.filter(
                (x) => x.id !== player.id,
              );
              console.log(
                `[${new Date().toISOString()}] Disconnected player ${p.name} removed from room ${roomCode} after 5min timeout`,
              );
              io.to(roomCode).emit(
                "room_updated",
                roomCode,
                currentRoom.players,
              );
              checkAndResetGame(roomCode);
            }
          }
        }, GRACE_PERIOD));
      }
    }

    io.to(roomCode).emit("room_updated", roomCode, room.players);
  });
});

// Charge en parallèle la playlist de chaque joueur. `selected` : morceaux retenus
// pour la partie ; `allTracks` : tous les morceaux chargés (base d'autocomplétion).
// Une playlist en échec prévient la room (playlist_load_error) et lève hasError.
async function loadPlayersTracks(
  room: Room,
  roomCode: string,
): Promise<{ allTracks: Track[]; selected: Track[]; hasError: boolean }> {
  let hasError = false;
  const fail = (p: Player, err?: unknown) => {
    if (err) console.error(`Error processing tracks for player ${p.name}:`, err);
    p.tracks = [];
    io.to(roomCode).emit("error", `playlist_load_error:${p.name}`);
    hasError = true;
  };

  const results = await Promise.all(
    room.players.map(async (p) => {
      if (!p.playlistUrl || p.playlistUrl.trim() === "") {
        p.tracks = [];
        return null;
      }
      try {
        const result = await selectTracks(p.playlistUrl, room.musicAmount, p);
        if (!result?.selectedTracks?.length) {
          fail(p);
          return null;
        }
        p.tracks = result.selectedTracks;
        return result;
      } catch (err) {
        fail(p, err);
        return null;
      }
    }),
  );

  return {
    allTracks: results.flatMap((r) => r?.tracks ?? []),
    selected: results.flatMap((r) => r?.selectedTracks ?? []),
    hasError,
  };
}

// Bases uniques pour l'autocomplétion : morceaux, et noms d'artistes séparés
// (un morceau "A feat. B" donne A et B)
function collectDatabases(tracks: Track[]): {
  databaseTracks: DatabaseTrack[];
  artistNames: string[];
} {
  const seenArtists = new Set<string>();
  const seenTracks = new Set<string>();
  const databaseTracks: DatabaseTrack[] = [];
  const artistNames: string[] = [];

  for (const t of tracks) {
    if (!t || typeof t.name !== "string" || typeof t.artist !== "string") {
      continue;
    }
    const trackKey = t.name.toLowerCase();
    if (!seenTracks.has(trackKey)) {
      seenTracks.add(trackKey);
      databaseTracks.push({
        name: t.name,
        internationalName: t.internationalName || t.name,
      });
    }
    for (const artistName of splitArtists(t.artist)) {
      const artistKey = artistName.toLowerCase();
      if (!seenArtists.has(artistKey)) {
        seenArtists.add(artistKey);
        artistNames.push(artistName);
      }
    }
  }
  return { databaseTracks, artistNames };
}

// Version internationale de chaque artiste : Groq en batch pour les noms non-ASCII,
// repli sur la translittération locale
async function buildArtistDatabase(
  artistNames: string[],
): Promise<DatabaseArtist[]> {
  const nonAscii = artistNames.filter((a) => /[^\x00-\x7F]/.test(a));
  let groqArtistMap = new Map<string, string>();
  if (nonAscii.length > 0) {
    try {
      groqArtistMap = await transliterateArtists(nonAscii);
    } catch (err) {
      console.warn("[servor] Erreur transliterateArtists Groq :", err);
    }
  }

  const database: DatabaseArtist[] = [];
  for (const artist of artistNames) {
    const internationalArtist =
      groqArtistMap.get(artist) || (await getInternationalName(artist));
    database.push({ artist, internationalArtist });
  }
  return database;
}

// Morceau prêt à jouer : champs par défaut et normalisations précalculées pour
// la correction des réponses (voir submit_answer)
function prepareTrack(track: Track, index: number): Track {
  const originalArtists = splitArtists(track.artist)
    .map((a) => normalizeString(a))
    .filter(Boolean);
  const internationalArtists = splitArtists(track.internationalArtist || "")
    .map((a) => normalizeString(a))
    .filter(Boolean);

  // Pour chaque artiste, les noms acceptés (original et international)
  const requiredArtists = originalArtists.map((orig, idx) => {
    const names = [orig];
    if (internationalArtists[idx]) names.push(internationalArtists[idx]);
    return names;
  });

  return {
    order: index + 1,
    name: track.name || "",
    artist: track.artist || "",
    internationalName: track.internationalName || track.name || "",
    internationalArtist: track.internationalArtist || track.artist || "",
    previewUrl: track.previewUrl || "",
    imageUrl: track.imageUrl || "",
    submittedBy: track.submittedBy || "",
    url: track.url || "",
    _normalizedName: normalizeString(track.name || ""),
    _normalizedIntName: normalizeString(track.internationalName || ""),
    _requiredArtists: requiredArtists,
    _rawArtist: normalizeString(track.artist || ""),
    _rawIntArtist: normalizeString(track.internationalArtist || ""),
  };
}

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Durée d'un tour : temps de réponse + 5 s de révélation + 2 s de transition
function getTurnInfo(
  time: number,
  gameStartTime: number,
  trackCount: number,
): { turn: number; phase: "guessing" | "answer" | "transition"; timeLeft: number } {
  const turnDuration = time + 5 + 2;
  const elapsed = (Date.now() - gameStartTime) / 1000;
  const turn = Math.floor(elapsed / turnDuration) + 1;
  if (turn > trackCount) {
    return { turn: trackCount + 1, phase: "transition", timeLeft: 0 };
  }
  const inTurn = elapsed % turnDuration;
  if (inTurn < time) {
    return { turn, phase: "guessing", timeLeft: Math.ceil(time - inTurn) };
  }
  if (inTurn < time + 5) {
    return { turn, phase: "answer", timeLeft: Math.ceil(time + 5 - inTurn) };
  }
  return { turn, phase: "transition", timeLeft: Math.ceil(turnDuration - inTurn) };
}

// Horloge de partie envoyée au client : il recalcule tour, phase et temps restant
// à partir de ces valeurs au lieu de décompter localement (serverNow sert à
// estimer l'écart entre les deux horloges).
function getGameTiming(time: number, gameStartTime: number): GameTiming {
  return { gameStartTime, serverNow: Date.now(), time };
}

// Une partie a été lancée et pas encore remise au lobby (les résultats comptent)
function hasActiveGame(room: Room): boolean {
  return !!(room.gameStartTime && room.toPlay.length > 0 && !room.isGameOver);
}

// La partie se joue réellement : on s'arrête à la fin de la phase de réponse du
// dernier morceau, comme le client (qui passe alors aux résultats)
function isGameRunning(room: Room): boolean {
  if (!hasActiveGame(room) || !room.gameStartTime) return false;
  const lastAnswerEnd =
    (room.toPlay.length - 1) * (room.time + 7) + room.time + 5;
  return Date.now() < room.gameStartTime + lastAnswerEnd * 1000;
}

function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function splitArtists(artistStr: string): string[] {
  if (!artistStr || typeof artistStr !== "string") return [];

  const separators =
    /,\s*|&\s*|\s+\/\s+|\s+(?:and|feat\.?|featuring|with)\s+/gi;

  return artistStr
    .split(separators)
    .map((a) => a.trim())
    .filter(
      (a) => a.length > 0 && !/^(feat\.?|featuring|with|&|and)$/i.test(a),
    );
}

const checkAndResetGame = (roomCode: string): void => {
  const room = rooms[roomCode];
  if (!room) return;

  const activePlayers = room.players.filter((p) => !p.leavedPlayer);
  const allInLobby = activePlayers.every((p) => p.inLobby);

  if (room.isGameOver && allInLobby) {
    activePlayers.forEach((p) => {
      p.isReady = p.isHost;
      p.inLobby = true;
      p.score = 0;
      p.artists_final_board = {};
      p.tracks_final_board = {};
      p.artists_scores_board = {};
      p.tracks_scores_board = {};
    });

    room.players = activePlayers;
    room.isGameOver = false;
    room.gameStartTime = null;
    room.isLoadingTracks = false;

    const rulesObj = {
      musicAmount: room.musicAmount,
      time: room.time,
    };

    io.to(roomCode).emit("game_reset", rulesObj, activePlayers);
  }
};
