// gameServer.js - Wordle WebSocket Server

import { WordleSession } from './wordleSession.js';

export class GameServer {
  constructor(io, roomManager) {
    this.io = io;
    this.roomManager = roomManager;
    this.gameSessions = new Map();
    this.playerSockets = new Map();
    this.collabRateLimits = new Map(); // Track last event time per player

    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Player connected: ${socket.id}`);

      socket.on('create-room', (data) => this.handleCreateRoom(socket, data));
      socket.on('join-room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave-room', () => this.handleLeaveRoom(socket));
      socket.on('player-ready', (data) => this.handlePlayerReady(socket, data));
      socket.on('start-game', () => this.handleStartGame(socket));
      socket.on('typing', (data) => this.handleTyping(socket, data));
      socket.on('collab-typing', (data) => this.handleCollabTyping(socket, data));
      socket.on('submit-guess', (data) => this.handleSubmitGuess(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  handleCreateRoom(socket, data) {
    const { roomId, joinCode, room } = this.roomManager.createRoom(socket.id, {});

    // Set room mode (competitive or collaborative)
    room.gameMode = data.gameMode || 'competitive';

    this.roomManager.joinRoom(roomId, socket.id, { name: data.playerName });

    socket.join(roomId);
    socket.data.roomId = roomId;
    this.playerSockets.set(socket.id, socket);

    // Mark as host
    const player = room.players.get(socket.id);
    if (player) player.isHost = true;

    socket.emit('room-created', { joinCode, isHost: true, gameMode: room.gameMode });
    this.broadcastRoomUpdate(roomId);
  }

  handleJoinRoom(socket, data) {
    const result = this.roomManager.joinRoomByCode(data.joinCode, socket.id, {
      name: data.playerName
    });

    if (!result.success) {
      socket.emit('error', result.error);
      return;
    }

    const roomId = result.room.id;
    socket.join(roomId);
    socket.data.roomId = roomId;
    this.playerSockets.set(socket.id, socket);

    socket.emit('room-joined', {
      joinCode: result.room.joinCode,
      isHost: result.room.host === socket.id
    });

    this.broadcastRoomUpdate(roomId);
  }

  handleLeaveRoom(socket) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    this.roomManager.leaveRoom(roomId, socket.id);
    socket.leave(roomId);
    socket.data.roomId = null;

    // Clean up game session if empty
    const room = this.roomManager.getRoom(roomId);
    if (!room && this.gameSessions.has(roomId)) {
      this.gameSessions.delete(roomId);
    }

    this.broadcastRoomUpdate(roomId);
  }

  handlePlayerReady(socket, data) {
    const roomId = socket.data.roomId;
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      player.ready = data.ready;
      this.broadcastRoomUpdate(roomId);
    }
  }

  handleStartGame(socket) {
    const roomId = socket.data.roomId;
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    if (room.host !== socket.id) {
      socket.emit('error', 'Only the host can start the game');
      return;
    }

    // Create or reset game session
    let session = this.gameSessions.get(roomId);
    if (!session) {
      session = new WordleSession(room, this.io);
      this.gameSessions.set(roomId, session);
    }

    session.start();

    // Notify all players
    this.io.to(roomId).emit('game-start', {
      gameMode: room.gameMode || 'competitive',
      players: Array.from(room.players.entries()).map(([id, p]) => ({
        id,
        name: p.name
      }))
    });
  }

  handleTyping(socket, data) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    // Broadcast to other players (not sender)
    socket.to(roomId).emit('player-typing', {
      playerId: socket.id,
      letterCount: data.letterCount,
      row: data.row
    });
  }

  handleCollabTyping(socket, data) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    // Rate limiting: max 10 events/second
    const now = Date.now();
    const lastTime = this.collabRateLimits.get(socket.id) || 0;
    if (now - lastTime < 100) { // 100ms = 10 events/sec
      console.warn(`Rate limit exceeded for player ${socket.id}`);
      return; // Drop the event
    }
    this.collabRateLimits.set(socket.id, now);

    // In collaborative mode, broadcast actual letters to all players including sender
    this.io.to(roomId).emit('collab-update', {
      playerId: socket.id,
      letters: data.letters,
      row: data.row,
      playerName: data.playerName
    });
  }

  handleSubmitGuess(socket, data) {
    const roomId = socket.data.roomId;
    const room = this.roomManager.getRoom(roomId);
    const session = this.gameSessions.get(roomId);
    if (!session) return;

    const isCollaborative = room?.gameMode === 'collaborative';
    const player = room?.players.get(socket.id);

    // In collaborative mode, notify others that submission is happening
    if (isCollaborative) {
      socket.to(roomId).emit('collab-submitting', {
        playerId: socket.id,
        playerName: player?.name,
        guess: data.guess
      });
    }

    const result = session.submitGuess(socket.id, data.guess);

    if (isCollaborative) {
      // In collaborative mode, send result to ALL players (including submitter)
      this.io.to(roomId).emit('collab-result', {
        ...result,
        submitterId: socket.id,
        submitterName: player?.name
      });
    } else {
      // Competitive mode - send result only to player
      socket.emit('guess-result', result);

      if (result.valid) {
        // Broadcast progress to others
        socket.to(roomId).emit('player-guessed', {
          playerId: socket.id,
          row: result.row,
          solved: result.status === 'won'
        });
      }
    }

    // Check if game is over
    if (result.valid && session.isGameOver()) {
      const gameOverData = session.getGameOverData();
      this.io.to(roomId).emit('game-over', gameOverData);
    }
  }

  handleDisconnect(socket) {
    console.log(`Player disconnected: ${socket.id}`);
    this.handleLeaveRoom(socket);
    this.playerSockets.delete(socket.id);
    this.collabRateLimits.delete(socket.id); // Clean up rate limit data
  }

  broadcastRoomUpdate(roomId) {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const players = {};
    for (const [id, player] of room.players) {
      players[id] = {
        name: player.name,
        ready: player.ready,
        isHost: room.host === id
      };
    }

    this.io.to(roomId).emit('room-update', { players });
  }

  getPlayerCount() {
    return this.playerSockets.size;
  }
}
