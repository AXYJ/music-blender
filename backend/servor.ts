import process from "process";
import crypto from "crypto";

try {
  (process as unknown as { loadEnvFile: () => void }).loadEnvFile?.();
} catch (e) {
  // Optionnel en production si les variables sont définies dans le système
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
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(
          origin,
        ) ||
        origin === "https://music-blender.xiao-web.com" ||
        origin === "https://museek.xiao-web.com"
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
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
      const roomCode = crypto.randomUUID().slice(0, 6).toUpperCase();
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
        leavedPlayers: [],
      };
      socket.join(roomCode);
      socket.emit("room_created", roomCode, rooms[roomCode].players);
    });

    // --------------------------------------------------------
    // Rejoindre une partie
    // --------------------------------------------------------
    socket.on("join_game", (roomCode: string, id: string, name: string) => {
      if (!rooms[roomCode]) {
        socket.emit("error", "room_not_found");
        return;
      }

      socket.data.roomCode = roomCode;
      socket.data.playerId = id;
      const room = rooms[roomCode];

      // Vérifier que la partie n'est pas pleine
      if (room.players.length >= 12) {
        socket.emit("error", "room_full");
        return;
      }
      // Vérifier si le joueur existe déjà
      const existingPlayer = room.players.find((p) => p.id === id);
      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        existingPlayer.leavedPlayer = false;
        if (existingPlayer.disconnectTimeout) {
          clearTimeout(existingPlayer.disconnectTimeout);
          delete existingPlayer.disconnectTimeout;
        }
        if (room.cleanupTimeout) {
          clearTimeout(room.cleanupTimeout);
          delete room.cleanupTimeout;
        }
        socket.join(roomCode);
        console.log(
          `[${new Date().toISOString()}] User ${socket.id} (${existingPlayer.name}) reconnected to room ${roomCode}`,
        );
      io.to(roomCode).emit("room_updated", roomCode, room.players);

      // Sync settings to the reconnecting player
      if (room.musicAmount !== undefined) {
        socket.emit("game-setting", "music_amount", room.musicAmount);
      }
      if (room.time !== undefined) {
        socket.emit("game-setting", "time", room.time);
      }

      // Si la partie est déjà en cours
      if (
        room.gameStartTime &&
        room.toPlay &&
        room.toPlay.length > 0 &&
        !room.isGameOver
      ) {
        existingPlayer.inLobby = false;

        const turnDuration = room.time + 5 + 2;
        const elapsedSeconds = (Date.now() - room.gameStartTime) / 1000;
        const currentTurn = Math.floor(elapsedSeconds / turnDuration) + 1;

        if (currentTurn <= room.toPlay.length) {
          const elapsedInTurn = elapsedSeconds % turnDuration;
          let phase: "guessing" | "answer" | "transition" = "guessing";
          let timeLeft = Math.ceil(room.time - elapsedInTurn);

          if (elapsedInTurn >= room.time && elapsedInTurn < room.time + 5) {
            phase = "answer";
            timeLeft = Math.ceil(room.time + 5 - elapsedInTurn);
          } else if (elapsedInTurn >= room.time + 5) {
            phase = "transition";
            timeLeft = Math.ceil(turnDuration - elapsedInTurn);
          }

          socket.emit("game_reconnected", {
            toPlay: room.toPlay,
            database_artists: room.database_artists || [],
            database_tracks: room.database_tracks || [],
            turn: currentTurn,
            phase: phase,
            timeLeft: timeLeft,
            time: room.time,
          });
        } else {
          // La partie est finie
          socket.emit("game_reconnected", {
            toPlay: room.toPlay,
            database_artists: room.database_artists || [],
            database_tracks: room.database_tracks || [],
            turn: room.toPlay.length + 1,
            phase: "transition",
            timeLeft: 0,
            time: room.time,
          });
        }
      } else {
        existingPlayer.inLobby = true;
      }
      return;
    } else {
      // Si non, on l'ajoute à la partie
      const isGameInProgress = !!(
        room.gameStartTime &&
        room.toPlay &&
        room.toPlay.length > 0 &&
        !room.isGameOver
      );

      rooms[roomCode].players.push({
        name: name,
        id: id,
        socketId: socket.id,
        isHost: false,
        leavedPlayer: false,
        inLobby: !isGameInProgress,
        score: 0,
        isReady: false,
      });
      socket.join(roomCode);
      console.log(
        `[${new Date().toISOString()}] User ${socket.id} joined room ${roomCode}`,
      );
      io.to(roomCode).emit("room_updated", roomCode, rooms[roomCode].players);

      // Sync settings to the newly joined player
      if (room.musicAmount !== undefined) {
        socket.emit("game-setting", "music_amount", room.musicAmount);
      }
      if (room.time !== undefined) {
        socket.emit("game-setting", "time", room.time);
      }

      // Si la partie est déjà en cours, on lui envoie les infos de reconnexion pour qu'il rejoigne l'écran de jeu
      if (isGameInProgress && room.gameStartTime) {
        const turnDuration = room.time + 5 + 2;
        const elapsedSeconds = (Date.now() - room.gameStartTime) / 1000;
        const currentTurn = Math.floor(elapsedSeconds / turnDuration) + 1;

        if (currentTurn <= room.toPlay.length) {
          const elapsedInTurn = elapsedSeconds % turnDuration;
          let phase: "guessing" | "answer" | "transition" = "guessing";
          let timeLeft = Math.ceil(room.time - elapsedInTurn);

          if (elapsedInTurn >= room.time && elapsedInTurn < room.time + 5) {
            phase = "answer";
            timeLeft = Math.ceil(room.time + 5 - elapsedInTurn);
          } else if (elapsedInTurn >= room.time + 5) {
            phase = "transition";
            timeLeft = Math.ceil(turnDuration - elapsedInTurn);
          }

          socket.emit("game_reconnected", {
            toPlay: room.toPlay,
            database_artists: room.database_artists || [],
            database_tracks: room.database_tracks || [],
            turn: currentTurn,
            phase: phase,
            timeLeft: timeLeft,
            time: room.time,
          });
        } else {
          // La partie est finie
          socket.emit("game_reconnected", {
            toPlay: room.toPlay,
            database_artists: room.database_artists || [],
            database_tracks: room.database_tracks || [],
            turn: room.toPlay.length + 1,
            phase: "transition",
            timeLeft: 0,
            time: room.time,
          });
        }
      }
    }
  });

  // Quitter une partie
  socket.on("leave_game", () => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player) return;

    delete socket.data.roomCode;
    if (player.disconnectTimeout) {
      clearTimeout(player.disconnectTimeout);
    }
    player.leavedPlayer = true;
    room.leavedPlayers = room.leavedPlayers || [];
    room.leavedPlayers.push(player);
    room.players = room.players.filter((p) => p.id !== player.id);
    console.log(
      `[${new Date().toISOString()}] User ${player.name} left room ${roomCode}`,
    );
    socket.leave(roomCode);

    // Si l'hôte est parti dans le lobby ou si la partie est finie, on attribue l'hôte à un autre joueur actif
    if (player.isHost && (!room.gameStartTime || room.isGameOver)) {
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
      checkAndResetGame(roomCode, rooms, io);
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
    const { roomCode, room } = getSocketContext(socket);
    if (!roomCode || !room) return;

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
    room.answers = {};
    room.gameStartTime = null;
    room.isLoadingTracks = false;
    io.to(roomCode).emit("game_started", room.players);
  });

  // Ajout des autres playlist
  socket.on("send_playlist_url", async (playlistUrl: string) => {
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player) return;
    player.playlistUrl = playlistUrl || "";

      // Vérifier si tous les joueurs ont répondu (url ou chaîne vide) et qu'on ne charge pas déjà
      const allSubmitted = room.players.every(
        (p) => p.playlistUrl !== undefined,
      );
      if (allSubmitted && !room.isLoadingTracks) {
        room.isLoadingTracks = true;
        room.toPlay = [];
        const allPlaylistTracks: Track[] = [];

        try {
          let hasError = false;
          const playerLoadPromises = room.players.map(async (p) => {
            if (p.playlistUrl && p.playlistUrl.trim() !== "") {
              try {
                const result = await selectTracks(
                  p.playlistUrl,
                  room.musicAmount,
                  p,
                );
                if (
                  !result ||
                  !result.selectedTracks ||
                  result.selectedTracks.length === 0
                ) {
                  p.tracks = [];
                  io.to(roomCode).emit(
                    "error",
                    `playlist_load_error:${p.name}`,
                  );
                  hasError = true;
                  return { tracks: [], selectedTracks: [] };
                } else {
                  p.tracks = result.selectedTracks;
                  return result;
                }
              } catch (err) {
                console.error(
                  `Error processing tracks for player ${p.name}:`,
                  err,
                );
                p.tracks = [];
                io.to(roomCode).emit(
                  "error",
                  `playlist_load_error:${p.name}`,
                );
                hasError = true;
                return { tracks: [], selectedTracks: [] };
              }
            } else {
              p.tracks = [];
              return { tracks: [], selectedTracks: [] };
            }
          });

          const results = await Promise.all(playerLoadPromises);

          for (const res of results) {
            if (res.tracks && res.tracks.length > 0) {
              allPlaylistTracks.push(...res.tracks);
            }
            if (res.selectedTracks && res.selectedTracks.length > 0) {
              room.toPlay.push(...res.selectedTracks);
            }
          }

          if (hasError || allPlaylistTracks.length < 1) {
            room.isLoadingTracks = false;
            if (allPlaylistTracks.length < 1 && !hasError) {
              io.to(roomCode).emit("no_playlist", "no_playlist_tracks");
            }
            return;
          }

          // Créer des databases uniques pour les artistes (séparés par feat) et les musiques
          const seenArtists = new Set<string>();
          const seenTracks = new Set<string>();
          const rawArtistsList: string[] = [];
          room.database_artists = [];
          room.database_tracks = [];
          for (const t of allPlaylistTracks) {
            if (
              t &&
              typeof t.name === "string" &&
              typeof t.artist === "string"
            ) {
              // 1. Gérer le nom de la musique
              const trackKey = t.name.toLowerCase();
              if (!seenTracks.has(trackKey)) {
                seenTracks.add(trackKey);
                room.database_tracks.push({
                  name: t.name,
                  internationalName: t.internationalName || t.name,
                });
              }

              // 2. Extraire les artistes individuellement
              const individualArtists = splitArtists(t.artist);
              for (const artistName of individualArtists) {
                const artistKey = artistName.toLowerCase();
                if (!seenArtists.has(artistKey)) {
                  seenArtists.add(artistKey);
                  rawArtistsList.push(artistName);
                }
              }
            }
          }

          // Translitérer en batch les artistes non-ASCII via Groq (avec fallback local)
          const nonAsciiArtists = rawArtistsList.filter((a) =>
            /[^\x00-\x7F]/.test(a),
          );
          let groqArtistMap = new Map<string, string>();
          if (nonAsciiArtists.length > 0) {
            try {
              groqArtistMap = await transliterateArtists(nonAsciiArtists);
            } catch (err) {
              console.warn("[servor] Erreur transliterateArtists Groq :", err);
            }
          }

          for (const artistName of rawArtistsList) {
            const groqTrans = groqArtistMap.get(artistName);
            const internationalArtist = groqTrans
              ? groqTrans
              : await getInternationalName(artistName);

            room.database_artists.push({
              artist: artistName,
              internationalArtist,
            });
          }

          // Randomiser l'ordre global des musiques sélectionnées (toPlay) et précalculer les normalisations
          const shuffledTracks = shuffle(room.toPlay);
          room.toPlay = shuffledTracks.map((track, index) => {
            const originalArtistsList = splitArtists(track.artist)
              .map((a) => normalizeString(a))
              .filter(Boolean);
            const internationalArtistsList = splitArtists(
              track.internationalArtist || "",
            )
              .map((a) => normalizeString(a))
              .filter(Boolean);

            const requiredArtists = originalArtistsList.map((orig, idx) => {
              const names = [orig];
              if (internationalArtistsList[idx]) {
                names.push(internationalArtistsList[idx]);
              }
              return names;
            });

            return {
              order: index + 1,
              name: track.name || "",
              artist: track.artist || "",
              internationalName:
                track.internationalName || track.name || "",
              internationalArtist:
                track.internationalArtist || track.artist || "",
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
          });
          room.gameStartTime = Date.now();
          room.isLoadingTracks = false;
          // Envoyer au front
          io.to(roomCode).emit(
            "data_loaded",
            room.toPlay,
            room.database_artists,
            room.database_tracks,
          );
        } catch (processingErr) {
          room.isLoadingTracks = false;
          socket.emit("error", "internal_error");
        }
      }
    });

  // --------------------------------------------------------
  // Paramètres de partie
  // --------------------------------------------------------

  // Musique par playlist
  socket.on("music_amount", (amount: number) => {
    const { roomCode, room } = getSocketContext(socket);
    if (!roomCode || !room) return;
    room.musicAmount = amount;
    io.to(roomCode).emit("game-setting", "music_amount", amount);
  });

  // Temps
  socket.on("time", (time: number) => {
    const { roomCode, room } = getSocketContext(socket);
    if (!roomCode || !room) return;
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

      room.answers = room.answers || {};
      room.answers[player.id] = {
        artist: artist,
        track: track,
        artist_correct: artist_score > 0,
        artist_score: artist_score,
        track_correct: track_answer,
      };

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
      checkAndResetGame(roomCode, rooms, io);
    }
  });

  const GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes de délai de grâce

  socket.on("disconnect", () => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
    const { roomCode, room, player } = getSocketContext(socket);
    if (!roomCode || !room || !player) return;

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
        if (player.disconnectTimeout) {
          clearTimeout(player.disconnectTimeout);
        }
        player.disconnectTimeout = setTimeout(() => {
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
        }, GRACE_PERIOD);
      } else if (!room.gameStartTime || room.isGameOver) {
        // Joueur non-hôte dans le lobby : le retirer s'il ne revient pas après 5 minutes
        if (player.disconnectTimeout) {
          clearTimeout(player.disconnectTimeout);
        }
        player.disconnectTimeout = setTimeout(() => {
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
              checkAndResetGame(roomCode, rooms, io);
            }
          }
        }, GRACE_PERIOD);
      }
    }

    io.to(roomCode).emit("room_updated", roomCode, room.players);
  });
});

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
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

export const checkAndResetGame = (
  roomCode: string,
  allRooms: Record<string, Room>,
  socketIo: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
): void => {
  const room = allRooms[roomCode];
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
    room.answers = {};
    room.gameStartTime = null;
    room.isLoadingTracks = false;

    const rulesObj = {
      musicAmount: room.musicAmount,
      time: room.time,
    };

    socketIo.to(roomCode).emit("game_reset", rulesObj, activePlayers);
  }
};
