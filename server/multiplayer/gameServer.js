// gameServer.js - Main WebSocket game server

import { GameSession } from './gameSession.js';

export class GameServer {
    constructor(io, roomManager) {
        this.io = io;
        this.roomManager = roomManager;
        this.gameSessions = new Map();
        this.playerSockets = new Map(); // Map player IDs to socket IDs
        
        this.setupSocketHandlers();
    }
    
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Player connected: ${socket.id}`);
            
            // Create room
            socket.on('create-room', (data, callback) => {
                this.handleCreateRoom(socket, data, callback);
            });
            
            // Join room
            socket.on('join-room', (data, callback) => {
                this.handleJoinRoom(socket, data, callback);
            });
            
            // Leave room
            socket.on('leave-room', (callback) => {
                this.handleLeaveRoom(socket, callback);
            });
            
            // Player ready
            socket.on('player-ready', (data) => {
                this.handlePlayerReady(socket, data);
            });
            
            // Start game
            socket.on('start-game', () => {
                this.handleStartGame(socket);
            });
            
            // Game input
            socket.on('game-input', (data) => {
                this.handleGameInput(socket, data);
            });
            
            // Chat message
            socket.on('chat-message', (message) => {
                this.handleChatMessage(socket, message);
            });
            
            // Disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
            
            // Ping for latency measurement
            socket.on('ping', (timestamp) => {
                socket.emit('pong', timestamp);
            });
        });
    }
    
    // Handle room creation
    handleCreateRoom(socket, data, callback) {
        const { roomId, joinCode, room } = this.roomManager.createRoom(socket.id, data.settings);
        
        // Join the room
        const joinResult = this.roomManager.joinRoom(roomId, socket.id, {
            name: data.playerName
        });
        
        if (joinResult.success) {
            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.playerId = socket.id;
            this.playerSockets.set(socket.id, socket);
            
            // Send room info to creator
            callback({
                success: true,
                roomId,
                joinCode,
                room: this.sanitizeRoom(room)
            });
            
            // Notify room update
            this.broadcastRoomUpdate(roomId);
        } else {
            callback({
                success: false,
                error: joinResult.error
            });
        }
    }
    
    // Handle joining room
    handleJoinRoom(socket, data, callback) {
        const joinResult = this.roomManager.joinRoomByCode(data.joinCode, socket.id, {
            name: data.playerName
        });
        
        if (joinResult.success) {
            const roomId = joinResult.room.id;
            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.playerId = socket.id;
            socket.data.isSpectator = joinResult.spectator;
            this.playerSockets.set(socket.id, socket);
            
            // Send room info to joiner
            callback({
                success: true,
                roomId,
                room: this.sanitizeRoom(joinResult.room),
                spectator: joinResult.spectator
            });
            
            // Notify other players
            socket.to(roomId).emit('player-joined', {
                playerId: socket.id,
                player: joinResult.room.players.get(socket.id)
            });
            
            // Broadcast room update
            this.broadcastRoomUpdate(roomId);
        } else {
            callback({
                success: false,
                error: joinResult.error
            });
        }
    }
    
    // Handle leaving room
    handleLeaveRoom(socket, callback) {
        const roomId = socket.data.roomId;
        
        if (!roomId) {
            callback({ success: false, error: 'Not in a room' });
            return;
        }
        
        const success = this.roomManager.leaveRoom(roomId, socket.id);
        
        if (success) {
            socket.leave(roomId);
            socket.data.roomId = null;
            this.playerSockets.delete(socket.id);
            
            // Stop game session if room is empty
            const room = this.roomManager.getRoom(roomId);
            if (!room && this.gameSessions.has(roomId)) {
                this.gameSessions.get(roomId).stop();
                this.gameSessions.delete(roomId);
            }
            
            // Notify other players
            socket.to(roomId).emit('player-left', {
                playerId: socket.id
            });
            
            // Broadcast room update
            this.broadcastRoomUpdate(roomId);
            
            callback({ success: true });
        } else {
            callback({ success: false, error: 'Failed to leave room' });
        }
    }
    
    // Handle player ready status
    handlePlayerReady(socket, data) {
        const roomId = socket.data.roomId;
        const room = this.roomManager.getRoom(roomId);
        
        if (!room) return;
        
        const player = room.players.get(socket.id);
        if (player) {
            player.ready = data.ready;
            
            // Broadcast to all players in room
            this.io.to(roomId).emit('player-ready-update', {
                playerId: socket.id,
                ready: data.ready
            });
            
            // Check if all players are ready
            const allReady = Array.from(room.players.values()).every(p => p.ready);
            if (allReady && room.players.size >= 2) {
                this.io.to(roomId).emit('all-players-ready');
            }
        }
    }
    
    // Handle game start
    handleStartGame(socket) {
        const roomId = socket.data.roomId;
        const room = this.roomManager.getRoom(roomId);
        
        if (!room) return;
        
        // Verify sender is host
        if (room.host !== socket.id) {
            socket.emit('error', 'Only the host can start the game');
            return;
        }
        
        // Check if all players are ready
        const allReady = Array.from(room.players.values()).every(p => p.ready);
        if (!allReady) {
            socket.emit('error', 'Not all players are ready');
            return;
        }
        
        // Start game session
        if (!this.gameSessions.has(roomId)) {
            const gameSession = new GameSession(room, this.io);
            this.gameSessions.set(roomId, gameSession);
            gameSession.start();
            
            // Update room state
            room.gameState.started = true;
            
            // Notify all players
            this.io.to(roomId).emit('game-started', {
                tick: 0,
                players: Array.from(room.players.values())
            });
        }
    }
    
    // Handle game input
    handleGameInput(socket, data) {
        const roomId = socket.data.roomId;
        const gameSession = this.gameSessions.get(roomId);
        
        if (!gameSession) return;
        
        // Add input to game session
        gameSession.addPlayerInput(socket.id, data);
    }
    
    // Handle chat message
    handleChatMessage(socket, message) {
        const roomId = socket.data.roomId;
        const room = this.roomManager.getRoom(roomId);
        
        if (!room) return;
        
        const player = room.players.get(socket.id);
        if (!player) return;
        
        // Broadcast message to room
        this.io.to(roomId).emit('chat-message', {
            playerId: socket.id,
            playerName: player.name,
            message: message,
            timestamp: Date.now()
        });
    }
    
    // Handle disconnect
    handleDisconnect(socket) {
        console.log(`Player disconnected: ${socket.id}`);
        
        const roomId = socket.data.roomId;
        if (roomId) {
            this.handleLeaveRoom(socket, () => {});
        }
        
        this.playerSockets.delete(socket.id);
    }
    
    // Broadcast room update to all players
    broadcastRoomUpdate(roomId) {
        const room = this.roomManager.getRoom(roomId);
        
        if (!room) return;
        
        this.io.to(roomId).emit('room-update', {
            room: this.sanitizeRoom(room)
        });
    }
    
    // Sanitize room data for client
    sanitizeRoom(room) {
        return {
            id: room.id,
            joinCode: room.joinCode,
            host: room.host,
            players: Array.from(room.players.entries()).map(([id, player]) => ({
                id,
                name: player.name,
                ready: player.ready,
                color: player.color,
                stats: player.stats
            })),
            settings: room.settings,
            gameState: {
                started: room.gameState.started,
                paused: room.gameState.paused,
                wave: room.gameState.wave
            }
        };
    }
    
    // Get total player count
    getPlayerCount() {
        return this.playerSockets.size;
    }
}