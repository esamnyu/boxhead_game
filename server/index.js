// index.js - Wordle for Friends Server
console.log('[STARTUP] Starting server...');
console.log('[STARTUP] Node version:', process.version);
console.log('[STARTUP] PORT env:', process.env.PORT);
console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
console.log('[STARTUP] CLIENT_URL env:', process.env.CLIENT_URL);

// Error handlers MUST be registered FIRST
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Received SIGTERM signal');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Received SIGINT signal');
  process.exit(0);
});

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

import { RoomManager } from './multiplayer/roomManager.js';
import { GameServer } from './multiplayer/gameServer.js';

console.log('[STARTUP] Imports completed successfully');
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// CORS configuration - allow Vercel and local development
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5500';
console.log('[CONFIG] CLIENT_URL:', CLIENT_URL);
const allowedOrigins = [
  CLIENT_URL,                    // Production Vercel URL from env
  'http://localhost:5500',       // Local dev
  'http://localhost:5501',       // Local dev multi-client
  'http://localhost:5502',       // Local dev multi-client
  'http://localhost:3000',       // Alternative local
  /\.vercel\.app$/,              // All Vercel preview/production domains
];
console.log('[CONFIG] Allowed origins:', allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log('[CORS] Socket.IO check for origin:', origin);

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        console.log('[CORS] No origin - allowing');
        return callback(null, true);
      }

      // Check if origin matches allowed origins
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) return allowed.test(origin);
        return allowed === origin;
      });

      if (isAllowed) {
        console.log('[CORS] Origin allowed:', origin);
        callback(null, true);
      } else {
        console.log('[CORS] Origin BLOCKED:', origin);
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

// Socket.IO engine debugging
io.engine.on("connection_error", (err) => {
  console.error('[SOCKET.IO] Connection error:', err.code, err.message, err.context);
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

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Required for Railway/cloud deployment

// Initialize game components
console.log('[STARTUP] Initializing RoomManager...');
const roomManager = new RoomManager();
console.log('[STARTUP] ✓ RoomManager initialized');

console.log('[STARTUP] Initializing GameServer...');
const gameServer = new GameServer(io, roomManager);
console.log('[STARTUP] ✓ GameServer initialized');

// Root endpoint
app.get('/', (req, res) => {
  console.log('[REQUEST] Root endpoint hit');
  res.json({ message: 'Wordle for Friends API', status: 'running', timestamp: new Date().toISOString() });
});

// Health check
app.get('/health', (req, res) => {
  console.log('[HEALTH] Health check requested');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    rooms: roomManager.getRoomCount(),
    players: gameServer.getPlayerCount()
  });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  console.log('[DEBUG] Debug endpoint hit');
  res.json({
    port: PORT,
    host: HOST,
    clientUrl: CLIENT_URL,
    nodeEnv: process.env.NODE_ENV,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Public rooms
app.get('/api/rooms', (req, res) => {
  console.log('[REQUEST] Public rooms requested');
  res.json(roomManager.getPublicRooms());
});

// 404 handler
app.use((req, res) => {
  console.log(`[404] Not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR] Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Server error handler
server.on('error', (err) => {
  console.error('[SERVER ERROR]', err);
});

console.log(`[STARTUP] Starting HTTP server on ${HOST}:${PORT}...`);
server.listen(PORT, HOST, () => {
  console.log(`[STARTUP] ✓ Server listening on ${HOST}:${PORT}`);
  console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('[STARTUP] ✓ Ready to accept connections');

  // Heartbeat log every 30 seconds to show server is alive
  setInterval(() => {
    console.log(`[HEARTBEAT] Server alive - uptime: ${Math.round(process.uptime())}s, rooms: ${roomManager.getRoomCount()}, players: ${gameServer.getPlayerCount()}`);
  }, 30000);
});
