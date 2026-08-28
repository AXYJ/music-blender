try {
    process.loadEnvFile();
} catch (e) {
    // Optionnel en production si les variables sont définies dans le système
}

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

// Initialisation
const app = express();
app.use(cors());

// Route de base pour vérifier que le serveur fonctionne
app.get("/", (req, res) => {
    res.send("Music Blender Server is running");
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://music-blender.xiao-web.com",
            "https://museek.xiao-web.com"
        ].filter(Boolean),
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ["polling", "websocket"],
    pingInterval: 25000,
    pingTimeout: 60000
});

// ----------------
// Démarrage du serveur
// ----------------

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// ----------------
// Gestion des connexions
// ----------------

// Stockage des parties
const rooms = {};

// Import des hooks
import fs from "fs";
import { transliterate } from "transliteration";
import selectTracks, { getInternationalName } from "./scripts/get-artists-tracks.js";

io.on("connection", (socket) => {
    console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);

    // --------------------------------------------------------
    // Création d'une partie
    // --------------------------------------------------------
    socket.on("create_game", (id, name) => {
        const roomCode = crypto.randomUUID().slice(0, 6).toUpperCase();
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
                    isReady: true
                }
            ],
            musicAmount: 3,
            time: 30,
            leavedPlayers: [],
        };
        socket.join(roomCode);
        socket.emit("room_created", roomCode, rooms[roomCode].players);
    })

    // --------------------------------------------------------
    // Rejoindre une partie
    // --------------------------------------------------------
    socket.on("join_game", (roomCode, id, name) => {
        if (!rooms[roomCode]) {
            socket.emit("error", "Room not found");
            return;
        }

        const room = rooms[roomCode];

        // Vérifier que la partie n'est pas pleine
        if (room.players.length >= 12) {
            socket.emit("error", "Room is full");
            return;
        }
        // Vérifier si le joueur existe déjà
        const existingPlayer = room.players.find((p) => p.id === id);
        if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            existingPlayer.leavedPlayer = false;
            socket.join(roomCode);
            console.log(`[${new Date().toISOString()}] User ${socket.id} reconnected to room ${roomCode}`);
            io.to(roomCode).emit("room_updated", roomCode, room.players);
            
            // Sync settings to the reconnecting player
            if (room.musicAmount !== undefined) {
                socket.emit("game-setting", "music_amount", room.musicAmount);
            }
            if (room.time !== undefined) {
                socket.emit("game-setting", "time", room.time);
            }

            // Si la partie est déjà en cours
            if (room.gameStartTime && room.toPlay && room.toPlay.length > 0 && !room.isGameOver) {
                existingPlayer.inLobby = false;
                
                const turnDuration = room.time + 5 + 2;
                const elapsedSeconds = (Date.now() - room.gameStartTime) / 1000;
                const currentTurn = Math.floor(elapsedSeconds / turnDuration) + 1;
                
                if (currentTurn <= room.toPlay.length) {
                    const elapsedInTurn = elapsedSeconds % turnDuration;
                    let phase = "guessing";
                    let timeLeft = Math.ceil(room.time - elapsedInTurn);
                    
                    if (elapsedInTurn >= room.time && elapsedInTurn < room.time + 5) {
                        phase = "answer";
                        timeLeft = Math.ceil((room.time + 5) - elapsedInTurn);
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
                        time: room.time
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
                        time: room.time
                    });
                }
            } else {
                existingPlayer.inLobby = true;
            }
            return;
        } else {
            // Si non, on l'ajoute à la partie
            const isGameInProgress = !!(room.gameStartTime && room.toPlay && room.toPlay.length > 0 && !room.isGameOver);

            rooms[roomCode].players.push({
                name: name,
                id: id,
                socketId: socket.id,
                isHost: false,
                leavedPlayer: false,
                inLobby: !isGameInProgress,
                score: 0,
            });
            socket.join(roomCode);
            console.log(`[${new Date().toISOString()}] User ${socket.id} joined room ${roomCode}`);
            io.to(roomCode).emit("room_updated", roomCode, rooms[roomCode].players);

            // Sync settings to the newly joined player
            if (room.musicAmount !== undefined) {
                socket.emit("game-setting", "music_amount", room.musicAmount);
            }
            if (room.time !== undefined) {
                socket.emit("game-setting", "time", room.time);
            }

            // Si la partie est déjà en cours, on lui envoie les infos de reconnexion pour qu'il rejoigne l'écran de jeu
            if (isGameInProgress) {
                const turnDuration = room.time + 5 + 2;
                const elapsedSeconds = (Date.now() - room.gameStartTime) / 1000;
                const currentTurn = Math.floor(elapsedSeconds / turnDuration) + 1;
                
                if (currentTurn <= room.toPlay.length) {
                    const elapsedInTurn = elapsedSeconds % turnDuration;
                    let phase = "guessing";
                    let timeLeft = Math.ceil(room.time - elapsedInTurn);
                    
                    if (elapsedInTurn >= room.time && elapsedInTurn < room.time + 5) {
                        phase = "answer";
                        timeLeft = Math.ceil((room.time + 5) - elapsedInTurn);
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
                        time: room.time
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
                        time: room.time
                    });
                }
            }
        }
    })

    // Quitter une partie
    socket.on("leave_game", () => {
        let foundRoomCode = null;
        let foundRoom = null;
        let foundPlayer = null;

        for (const code in rooms) {
            const room = rooms[code];
            const player = room.players.find((p) => p.socketId === socket.id);
            if (player) {
                foundRoomCode = code;
                foundRoom = room;
                foundPlayer = player;
                break;
            }
        }

        if (foundRoom && foundPlayer) {
            foundPlayer.leavedPlayer = true;
            foundRoom.leavedPlayers = foundRoom.leavedPlayers || [];
            foundRoom.leavedPlayers.push(foundPlayer);
            foundRoom.players = foundRoom.players.filter((p) => p.socketId !== socket.id);
            console.log(`[${new Date().toISOString()}] User ${foundPlayer.name} left room ${foundRoomCode}`);
            socket.leave(foundRoomCode);

            // Si l'hôte est parti dans le lobby ou si la partie est finie, on attribue l'hôte à un autre joueur
            if (foundPlayer.isHost && (!foundRoom.gameStartTime || foundRoom.isGameOver)) {
                const newHost = foundRoom.players.find(p => !p.leavedPlayer);
                if (newHost) {
                    newHost.isHost = true;
                    newHost.isReady = true;
                }
            }

            // Si plus aucun joueur dans la room, on supprime la room
            if (foundRoom.players.length === 0) {
                delete rooms[foundRoomCode];
                console.log(`[${new Date().toISOString()}] Room ${foundRoomCode} deleted because it is empty`);
            } else {
                io.to(foundRoomCode).emit("room_updated", foundRoomCode, foundRoom.players);
                checkAndResetGame(foundRoomCode, rooms, io);
            }
        }
    });

    // Prêt
    socket.on("ready", (isReady) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find((p) => p.socketId === socket.id);
            if (player) {
                player.isReady = isReady;
                io.to(roomCode).emit("room_updated", roomCode, rooms[roomCode].players);
            }
        }
    });

    // Lancement de la partie
    socket.on("start_game", () => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            // Réinitialiser la propriété playlistUrl de tous les joueurs à undefined pour pouvoir suivre les retours
            room.players.forEach(p => {
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
        }
    });
    
    // Ajout des autres playlist
    socket.on("send_playlist_url", async (playlistUrl) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find((p) => p.socketId === socket.id);
            if (player) {
                player.playlistUrl = playlistUrl || "";
            }

            // Vérifier si tous les joueurs ont répondu (url ou chaîne vide) et qu'on ne charge pas déjà
            const allSubmitted = room.players.every((p) => p.playlistUrl !== undefined);
            if (allSubmitted && !room.isLoadingTracks) {
                room.isLoadingTracks = true;
                room.toPlay = [];
                const allPlaylistTracks = [];

                try {
                    let hasError = false;
                    for (const p of room.players) {
                        if (p.playlistUrl && p.playlistUrl.trim() !== "") {
                            try {
                                const result = await selectTracks(p.playlistUrl, room.musicAmount, p);
                                if (!result || !result.selectedTracks || result.selectedTracks.length === 0) {
                                    p.tracks = [];
                                    io.to(roomCode).emit("error", `La playlist de ${p.name} n'a pas pu être chargée.`);
                                    hasError = true;
                                } else {
                                    p.tracks = result.selectedTracks;
                                    allPlaylistTracks.push(...result.tracks);
                                    room.toPlay.push(...result.selectedTracks);
                                }
                            } catch (err) {
                                console.error(`Error processing tracks for player ${p.name}:`, err);
                                p.tracks = [];
                                io.to(roomCode).emit("error", `La playlist de ${p.name} n'a pas pu être chargée.`);
                                hasError = true;
                            }
                        } else {
                            p.tracks = [];
                        }
                    } 

                    if (hasError || allPlaylistTracks.length < 1) {
                        room.isLoadingTracks = false;
                        if (allPlaylistTracks.length < 1 && !hasError) {
                            io.to(roomCode).emit("no_playlist", "Aucune musique trouvée dans les playlists.");
                        }
                        return;
                    }

                    // Créer des databases uniques pour les artistes (séparés par feat) et les musiques
                    const seenArtists = new Set();
                    const seenTracks = new Set();
                    room.database_artists = [];
                    room.database_tracks = [];
                    for (const t of allPlaylistTracks) {
                        if (t && typeof t.name === "string" && typeof t.artist === "string") {
                            // 1. Gérer le nom de la musique
                            const trackKey = t.name.toLowerCase();
                            if (!seenTracks.has(trackKey)) {
                                seenTracks.add(trackKey);
                                room.database_tracks.push({
                                    name: t.name,
                                    internationalName: t.internationalName || t.name,
                                });
                            }

                            // 2. Gérer les artistes individuellement (séparation des feats)
                            const individualArtists = splitArtists(t.artist);
                            for (const artistName of individualArtists) {
                                const artistKey = artistName.toLowerCase();
                                if (!seenArtists.has(artistKey)) {
                                    seenArtists.add(artistKey);
                                    room.database_artists.push({
                                        artist: artistName,
                                        internationalArtist: await getInternationalName(artistName)
                                    });
                                }
                            }
                        }
                    }

                    // Randomiser l'ordre global des musiques sélectionnées (toPlay)
                    const shuffledTracks = shuffle(room.toPlay);
                    room.toPlay = shuffledTracks.map((track, index) => ({
                        order: index + 1,
                        name: track.name || "",
                        artist: track.artist || "",
                        internationalName: track.internationalName || track.name || "",
                        internationalArtist: track.internationalArtist || track.artist || "",
                        previewUrl: track.previewUrl || "",
                        imageUrl: track.imageUrl || "",
                        submittedBy: track.submittedBy || "",
                        url: track.url || ""
                    }));
                    room.gameStartTime = Date.now();
                    room.isLoadingTracks = false;
                    // Envoyer au front
                    io.to(roomCode).emit("data_loaded", room.toPlay, room.database_artists, room.database_tracks);
                } catch (processingErr) {
                    room.isLoadingTracks = false;
                    socket.emit("error", "Une erreur interne est survenue lors de la préparation de la partie.");
                }
            }
        }
    });

    // --------------------------------------------------------
    // Paramètres de partie
    // --------------------------------------------------------

    // Musique par playlist
    socket.on("music_amount", (amount) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            room.musicAmount = amount;
            io.to(roomCode).emit("game-setting", "music_amount", amount);
        }
    });

    // Temps
    socket.on("time", (time) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            room.time = time;
            io.to(roomCode).emit("game-setting", "time", time);
        }
    });

    // --------------------------------------------------------
    // Actions en partie
    // --------------------------------------------------------

    // Envoi de la réponse
    socket.on("submit_answer", (artist, track, turn) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find((p) => p.socketId === socket.id);
            if (player) {
                const currentTrack = room.toPlay[turn - 1];
                if (currentTrack) {
                    const trackGuess = normalizeString(track);


                    const correctTrack = normalizeString(currentTrack.name);
                    const correctIntTrack = normalizeString(currentTrack.internationalName);

                    // Split the player's artist guesses by comma
                    const playerGuesses = (artist || "")
                        .split(",")
                        .map(a => normalizeString(a))
                        .filter(Boolean);

                    // Extract the required individual artists for this track (both original and international names)
                    const originalArtistsList = splitArtists(currentTrack.artist).map(a => normalizeString(a)).filter(Boolean);
                    const internationalArtistsList = splitArtists(currentTrack.internationalArtist).map(a => normalizeString(a)).filter(Boolean);

                    // Build lists of acceptable names for each individual artist
                    const requiredArtists = originalArtistsList.map((orig, idx) => {
                        const names = [orig];
                        if (internationalArtistsList[idx]) {
                            names.push(internationalArtistsList[idx]);
                        }
                        return names;
                    });

                    // Count how many required artists are matched by the player's guesses
                    let matchedCount = 0;
                    for (const acceptableNames of requiredArtists) {
                        const isGuessed = playerGuesses.some(guess => acceptableNames.includes(guess));
                        if (isGuessed) {
                            matchedCount++;
                        }
                    }

                    // Score calculation:
                    // 1 point if all required artists are guessed.
                    // 0.5 points if at least one but not all required artists are guessed.
                    // 0 points otherwise.
                    let artist_score = 0;
                    if (requiredArtists.length > 0) {
                        if (matchedCount === requiredArtists.length) {
                            artist_score = 1;
                        } else if (matchedCount > 0) {
                            artist_score = 0.5;
                        }
                    } else {
                        // Fallback in case requiredArtists is empty
                        const rawArtist = normalizeString(currentTrack.artist);
                        const rawIntArtist = normalizeString(currentTrack.internationalArtist);
                        if (playerGuesses.some(guess => guess === rawArtist || guess === rawIntArtist)) {
                            artist_score = 1;
                        }
                    }

                    const track_answer = (trackGuess === correctTrack || trackGuess === correctIntTrack);

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
                        track_correct: track_answer
                    };

                    // Calcul et mise à jour du score sur le serveur
                    let additionalScore = artist_score;
                    if (track_answer) {
                        additionalScore += 1;
                    }
                    player.score = (player.score || 0) + additionalScore;

                    io.to(roomCode).emit("answer", player.name, artist_score, track_answer);
                }
            }
        }
    });

    // --------------------------------------------------------
    // Post game
    // --------------------------------------------------------

    // Demande des scores finaux
    socket.on("get_final_scores", () => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            socket.emit("final_scores", room.players);
        }
    });

    // Retour au lobby
    socket.on("restart_game", () => {
        for (const code in rooms) {
            const room = rooms[code];
            const player = room.players.find((p) => p.socketId === socket.id);
            if (player) {
                player.inLobby = true;
                player.isReady = player.isHost;
                room.isGameOver = true;
                io.to(code).emit("room_updated", code, room.players);
                checkAndResetGame(code, rooms, io);
                break;
            }
        }
    });

    socket.on("disconnect", () => {
        console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
        for (const code in rooms) {
            const room = rooms[code];
            const player = room.players.find((p) => p.socketId === socket.id);
            if (player) {
                // Si la partie n'a pas commencé, ou est finie, on peut le supprimer
                if (!room.gameStartTime || room.isGameOver) {
                    room.players = room.players.filter((p) => p.socketId !== socket.id);
                    // Si plus aucun joueur dans la room, on supprime la room
                    if (room.players.length === 0) {
                        delete rooms[code];
                        console.log(`[${new Date().toISOString()}] Room ${code} deleted because it is empty`);
                    } else {
                        // S'il reste des gens, on met à jour la liste des joueurs
                        io.to(code).emit("room_updated", code, room.players);
                        
                        // Si l'hôte est parti, on attribue l'hôte à un autre joueur
                        if (player.isHost) {
                            const newHost = room.players.find(p => !p.leavedPlayer);
                            if (newHost) {
                                newHost.isHost = true;
                                newHost.isReady = true;
                                io.to(code).emit("room_updated", code, room.players);
                            }
                        }
                        checkAndResetGame(code, rooms, io);
                    }
                } else {
                    // Sinon (partie en cours), on le marque simplement comme déconnecté temporaire
                    player.leavedPlayer = true;
                    
                    // Si plus aucun joueur n'est actif dans la room, on supprime la room
                    const activePlayers = room.players.filter((p) => !p.leavedPlayer);
                    if (activePlayers.length === 0) {
                        delete rooms[code];
                        console.log(`[${new Date().toISOString()}] Room ${code} deleted because all players left`);
                    } else {
                        // Si l'hôte est parti, on attribue l'hôte à un autre joueur actif
                        if (player.isHost) {
                            player.isHost = false;
                            const newHost = activePlayers[0];
                            if (newHost) {
                                newHost.isHost = true;
                            }
                        }
                        io.to(code).emit("room_updated", code, room.players);
                    }
                }
                break;
            }
        }
    });
});

function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function normalizeString(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function splitArtists(artistStr) {
    if (!artistStr || typeof artistStr !== "string") return [];
    
    // Split by symbols (with optional spaces for comma/ampersand, mandatory spaces for slash)
    // or words (with mandatory spaces)
    const separators = /,\s*|&\s*|\s+\/\s+|\s+(?:and|feat\.?|featuring|with)\s+/gi;
    
    return artistStr
        .split(separators)
        .map(a => a.trim())
        .filter(a => a.length > 0 && !/^(feat\.?|featuring|with|&|and)$/i.test(a));
}

export const checkAndResetGame = (roomCode, rooms, io) => {
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
        room.answers = {};
        room.gameStartTime = null;
        room.isLoadingTracks = false;

        const rulesObj = {
            musicAmount: room.musicAmount,
            time: room.time
        };

        io.to(roomCode).emit("game_reset", rulesObj, activePlayers);
    }
};