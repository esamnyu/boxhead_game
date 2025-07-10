// index.js - Main server entry point

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

import { RoomManager } from './multiplayer/roomManager.js';
import { GameServer } from './multiplayer/gameServer.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    },
    pingTimeout: 20000,
    pingInterval: 10000
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(join(__dirname, '../')));
    app.get('/', (req, res) => {
        res.sendFile(join(__dirname, '../index.html'));
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        rooms: roomManager.getRoomCount(),
        players: gameServer.getPlayerCount()
    });
});

// Room list endpoint
app.get('/api/rooms', (req, res) => {
    res.json(roomManager.getPublicRooms());
});

// Initialize managers
const roomManager = new RoomManager();
const gameServer = new GameServer(io, roomManager);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🎮 Boxhead Multiplayer Server running on port ${PORT}`);
    console.log(`🌐 WebSocket endpoint: ws://localhost:${PORT}`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`🚀 Production mode - serving client files`);
    }
});