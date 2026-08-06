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
// Clé: roomCode, Valeur: { players, rules, threshold, history, playerOrder, lastEffect }
const rooms = {};

io.on("connection", (socket) => {
    console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);

    // --------------------------------------------------------
    // Création d'une partie
    // --------------------------------------------------------
    socket.on("create_game", (socketId, id, name) => {
        const roomCode = crypto.randomUUID().slice(0, 6).toUpperCase();
        rooms[roomCode] = {
            players: [
                {
                    name: name,
                    id: id,
                    socketId: socketId,
                    isHost: true,
                    leavedPlayer: false,
                    inLobby: true,
                    score: 0,
                    isReady: true
                }
            ],
        };
        socket.join(roomCode);
        console.log(`[${new Date().toISOString()}] Room created: ${roomCode} with host ${name}`);
        socket.emit("room_created", roomCode, rooms[roomCode].players);
    })

    // --------------------------------------------------------
    // Rejoindre une partie
    // --------------------------------------------------------
    socket.on("join_game", (roomCode, socketId, id, name) => {
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
            existingPlayer.socketId = socketId;
            existingPlayer.inLobby = true;
            socket.join(roomCode);
            console.log(`[${new Date().toISOString()}] User ${socketId} reconnected to room ${roomCode}`);
            io.to(roomCode).emit("room_updated", roomCode, rooms[roomCode].players);
            return;
        } else {
            // Si non, on l'ajoute à la partie
            rooms[roomCode].players.push({
                name: name,
                id: id,
                socketId: socketId,
                isHost: false,
                leavedPlayer: false,
                inLobby: true,
                score: 0,
            });
            socket.join(roomCode);
            console.log(`[${new Date().toISOString()}] User ${socketId} joined room ${roomCode}`);
            io.to(roomCode).emit("room_updated", roomCode, rooms[roomCode].players);
        }
    })

    // Prêt
    socket.on("ready", (isReady, userId) => {
        const roomCode = Array.from(socket.rooms).find((r) => r !== socket.id);
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find((p) => p.id === userId);
            if (player) {
                player.isReady = isReady;
                console.log(`[${new Date().toISOString()}] User ${player.name} is ${isReady ? "ready" : "not ready"}`);
                io.to(roomCode).emit("room_updated", roomCode, rooms[roomCode].players);
            }
        }
    });

});