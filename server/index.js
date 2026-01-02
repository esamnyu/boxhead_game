// index.js - Wordle for Friends Server
console.log('Starting server...');
console.log('Node version:', process.version);
console.log('PORT env:', process.env.PORT);

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

import { RoomManager } from './multiplayer/roomManager.js';
import { GameServer } from './multiplayer/gameServer.js';

console.log('Imports completed successfully');
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// CORS configuration - allow Vercel and local development
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5500';
const allowedOrigins = [
  CLIENT_URL,                    // Production Vercel URL from env
  'http://localhost:5500',       // Local dev
  'http://localhost:5501',       // Local dev multi-client
  'http://localhost:5502',       // Local dev multi-client
  'http://localhost:3000',       // Alternative local
  /\.vercel\.app$/,              // All Vercel preview/production domains
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Check if origin matches allowed origins
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) return allowed.test(origin);
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    callback(null, true); // Allow all for now
  },
  credentials: true
}));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Wordle for Friends API', status: 'running' });
});

// Health check
app.get('/health', (req, res) => {
  console.log('Health check hit');
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
const HOST = '0.0.0.0'; // Required for Railway/cloud deployment

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, HOST, () => {
  console.log(`Wordle for Friends server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
