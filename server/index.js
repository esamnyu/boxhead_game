// index.js - Wordle for Friends Server

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

import { RoomManager } from './multiplayer/roomManager.js';
import { GameServer } from './multiplayer/gameServer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 20000,
  pingInterval: 10000
});

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(join(__dirname, '../')));
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: roomManager.getRoomCount(),
    players: gameServer.getPlayerCount()
  });
});

// Public rooms
app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getPublicRooms());
});

const roomManager = new RoomManager();
const gameServer = new GameServer(io, roomManager);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Wordle for Friends server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
