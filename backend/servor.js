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
            "https://music-blender.xiao-web.com"
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
import selectTracks from "./streaming/connectSpotify.js";

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
        };
        socket.join(roomCode);
        console.log(`[${new Date().toISOString()}] Room created: ${roomCode} with host ${name}`);
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
        if (room.players.length >= 8) {
            socket.emit("error", "Room is full");
            return;
        }
        // Vérifier si le joueur existe déjà
        const existingPlayer = room.players.find((p) => p.id === id);
        if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            existingPlayer.inLobby = true;
            socket.join(roomCode);
            console.log(`[${new Date().toISOString()}] User ${socket.id} reconnected to room ${roomCode}`);
            io.to(roomCode).emit("room_updated", roomCode, rooms[roomCode].players);
            
            // Sync settings to the reconnecting player
            if (room.musicAmount !== undefined) {
                socket.emit("game-setting", "music_amount", room.musicAmount);
            }
            if (room.time !== undefined) {
                socket.emit("game-setting", "time", room.time);
            }
            return;
        } else {
            // Si non, on l'ajoute à la partie
            rooms[roomCode].players.push({
                name: name,
                id: id,
                socketId: socket.id,
                isHost: false,
                leavedPlayer: false,
                inLobby: true,
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
        }
    })

    // Prêt
    socket.on("ready", (isReady) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find((p) => p.socketId === socket.id);
            if (player) {
                player.isReady = isReady;
                console.log(`[${new Date().toISOString()}] User ${player.name} is ${isReady ? "ready" : "not ready"}`);
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
            });
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
                console.log(`[${new Date().toISOString()}] Playlist URL set for player ${player.name} in room ${roomCode}: ${playlistUrl}`);
            }

            // Vérifier si tous les joueurs ont répondu (url ou chaîne vide)
            const allSubmitted = room.players.every((p) => p.playlistUrl !== undefined);
            if (allSubmitted) {
                console.log(`[${new Date().toISOString()}] All playlist submissions received. Players state:`);
                room.players.forEach(p => {
                    console.log(`  -> Player "${p.name}" (Socket: ${p.socketId}): URL="${p.playlistUrl}"`);
                });
                console.log(`[${new Date().toISOString()}] Loading tracks...`);
                room.toPlay = [];
                const allPlaylistTracks = [];

                for (const p of room.players) {
                    if (p.playlistUrl && p.playlistUrl.trim() !== "") {
                        try {
                            const result = await selectTracks(p.playlistUrl, room.musicAmount, p);
                            p.tracks = result.selectedTracks;
                            allPlaylistTracks.push(...result.tracks);
                            room.toPlay.push(...result.selectedTracks);
                            console.log(`[Spotify] Loaded ${result.tracks.length} tracks (${result.selectedTracks.length} selected) for player "${p.name}"`);
                        } catch (err) {
                            console.error(`Error processing tracks for player ${p.name}:`, err);
                        }
                    } else {
                        console.log(`[Spotify] No playlist URL provided for player "${p.name}" (using empty list)`);
                        p.tracks = [];
                    }
                }

                try {
                    // Créer une database unique (sans doublons) contenant uniquement { name, artist }
                    const seen = new Set();
                    room.database = [];
                    for (const t of allPlaylistTracks) {
                        if (t && typeof t.name === "string" && typeof t.artist === "string") {
                            const key = `${t.name.toLowerCase()}|||${t.artist.toLowerCase()}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                room.database.push({
                                    name: t.name,
                                    artist: t.artist
                                });
                            }
                        }
                    }

                    // Randomiser l'ordre global des musiques sélectionnées (toPlay)
                    const shuffledTracks = shuffle(room.toPlay);
                    room.toPlay = shuffledTracks.map((track, index) => ({
                        order: index + 1,
                        name: track.name || "Inconnu",
                        artist: track.artist || "Inconnu",
                        previewUrl: track.previewUrl || "",
                        imageUrl: track.imageUrl || "",
                        submittedBy: track.submittedBy || "Inconnu"
                    }));

                    // Sauvegarder la base de données dans un JSON
                    try {
                        await fs.promises.writeFile(
                            `room_${roomCode}_db.json`,
                            JSON.stringify(room.database, null, 2)
                        );
                        console.log(`[${new Date().toISOString()}] Database saved to room_${roomCode}_db.json`);
                    } catch (fsErr) {
                        console.error("Failed to save room database JSON:", fsErr);
                    }

                    // Envoyer au front
                    io.to(roomCode).emit("data_loaded", room.toPlay, room.database);
                } catch (processingErr) {
                    console.error("Error during game data processing:", processingErr);
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
            console.log(`[${new Date().toISOString()}] Music amount set to ${amount}`);
            io.to(roomCode).emit("game-setting", "music_amount", amount);
        }
    });

    // Temps
    socket.on("time", (time) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            room.time = time;
            console.log(`[${new Date().toISOString()}] Time set to ${time}`);
            io.to(roomCode).emit("game-setting", "time", time);
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