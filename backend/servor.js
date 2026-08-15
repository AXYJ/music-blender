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
import { transliterate } from "transliteration";
import selectTracks from "./streaming/connectSpotify.js";
import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const kuroshiro = new Kuroshiro.default();
let kuroshiroReady = false;

kuroshiro.init(new KuromojiAnalyzer())
    .then(() => {
        kuroshiroReady = true;
    })
    .catch((err) => {
        console.error("[Kuroshiro servor] Failed to initialize:", err);
    });

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
                        submittedBy: track.submittedBy || ""
                    }));
                    // Envoyer au front
                    io.to(roomCode).emit("data_loaded", room.toPlay, room.database_artists, room.database_tracks);
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

    // Envoi de la réponse
    socket.on("submit_answer", (artist, track, turn) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find((p) => p.socketId === socket.id);
            if (player) {
                const currentTrack = room.toPlay[turn - 1];
                if (currentTrack) {
                    const artistGuess = (artist || "").trim().toLowerCase();
                    const trackGuess = (track || "").trim().toLowerCase();

                    const correctTrack = (currentTrack.name || "").trim().toLowerCase();
                    const correctIntTrack = (currentTrack.internationalName || "").trim().toLowerCase();

                    const acceptableArtists = [
                        (currentTrack.artist || ""),
                        (currentTrack.internationalArtist || ""),
                        ...splitArtists(currentTrack.artist),
                        ...splitArtists(currentTrack.internationalArtist)
                    ].map(a => a.trim().toLowerCase()).filter(Boolean);

                    const artist_answer = acceptableArtists.includes(artistGuess);
                    const track_answer = (trackGuess === correctTrack || trackGuess === correctIntTrack);

                    room.answers = room.answers || {};
                    room.answers[player.id] = {
                        artist: artist,
                        track: track,
                        artist_correct: artist_answer,
                        track_correct: track_answer
                    };

                    io.to(roomCode).emit("answer", player.name, artist_answer, track_answer);
                }
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

async function getInternationalName(text) {
    if (!text || typeof text !== "string") return "";
    
    let result = text;
    // Use [^()]+ to ensure we match the LAST individual parenthesized block
    const parenthesizedMatch = text.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    if (parenthesizedMatch) {
        const part1 = parenthesizedMatch[1].trim();
        const part2 = parenthesizedMatch[2].trim();
        
        // Check if the parentheses contain a featuring artist
        const isFeaturing = /^(feat|featuring|with)\b/i.test(part2);
        
        if (isFeaturing) {
            // Recursively process the title part, then append the featuring part back
            const p1 = await getInternationalName(part1);
            result = `${p1} (${part2})`;
        } else {
            const isPart1Ascii = !/[^\x00-\x7F]/.test(part1);
            const isPart2Ascii = !/[^\x00-\x7F]/.test(part2);
            
            if (isPart1Ascii && !isPart2Ascii) result = part1;
            if (isPart2Ascii && !isPart1Ascii) result = part2;
        }
    } else {
        const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
        const isCJK = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
        
        if (isCJK && kuroshiroReady) {
            try {
                const converted = await kuroshiro.convert(text, {
                    to: "romaji",
                    romajiSystem: "hepburn"
                });
                
                const hasRemainingCJK = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(converted);
                if (hasRemainingCJK) {
                    if (hasKana) {
                        result = transliterate(converted);
                    } else {
                        result = transliterate(text);
                    }
                } else {
                    result = converted;
                }
            } catch (err) {
                console.error("Kuroshiro conversion error:", err);
                if (/[^\x00-\x7F]/.test(text)) {
                    result = transliterate(text);
                }
            }
        } else if (/[^\x00-\x7F]/.test(text)) {
            result = transliterate(text);
        }
    }
    
    return result.replace(/\s+/g, "");
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