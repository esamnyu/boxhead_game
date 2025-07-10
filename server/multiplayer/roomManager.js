// roomManager.js - Manages game rooms and join codes

import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.joinCodes = new Map(); // Map join codes to room IDs
        this.codeLength = parseInt(process.env.ROOM_CODE_LENGTH) || 6;
        this.maxPlayersPerRoom = parseInt(process.env.MAX_PLAYERS_PER_ROOM) || 8;
        this.roomExpiryMinutes = parseInt(process.env.ROOM_EXPIRY_MINUTES) || 30;
        
        // Start cleanup interval
        this.startCleanupInterval();
    }
    
    // Generate unique join code
    generateJoinCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        
        // Keep generating until we find a unique code
        do {
            code = '';
            for (let i = 0; i < this.codeLength; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (this.joinCodes.has(code));
        
        return code;
    }
    
    // Create a new room
    createRoom(hostSocketId, options = {}) {
        const roomId = uuidv4();
        const joinCode = this.generateJoinCode();
        
        const room = {
            id: roomId,
            joinCode: joinCode,
            host: hostSocketId,
            players: new Map(),
            spectators: new Set(),
            settings: {
                maxPlayers: options.maxPlayers || this.maxPlayersPerRoom,
                isPublic: options.isPublic || false,
                mapSize: options.mapSize || 'medium',
                difficulty: options.difficulty || 'normal',
                friendlyFire: options.friendlyFire || false
            },
            gameState: {
                started: false,
                paused: false,
                wave: 1,
                tick: 0
            },
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        
        // Store room
        this.rooms.set(roomId, room);
        this.joinCodes.set(joinCode, roomId);
        
        console.log(`Room created: ${roomId} with join code: ${joinCode}`);
        
        return { roomId, joinCode, room };
    }
    
    // Join a room by code
    joinRoomByCode(joinCode, playerId, playerData) {
        const roomId = this.joinCodes.get(joinCode.toUpperCase());
        
        if (!roomId) {
            return { success: false, error: 'Invalid join code' };
        }
        
        return this.joinRoom(roomId, playerId, playerData);
    }
    
    // Join a room by ID
    joinRoom(roomId, playerId, playerData) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        
        if (room.players.size >= room.settings.maxPlayers) {
            // Add as spectator if room is full
            room.spectators.add(playerId);
            return { success: true, room, spectator: true };
        }
        
        // Add player to room
        room.players.set(playerId, {
            id: playerId,
            name: playerData.name || `Player ${room.players.size + 1}`,
            ready: false,
            color: playerData.color || this.getPlayerColor(room.players.size),
            stats: {
                kills: 0,
                deaths: 0,
                score: 0
            },
            state: {
                x: 0,
                y: 0,
                health: 100,
                weapon: 'pistol'
            }
        });
        
        room.lastActivity = Date.now();
        
        return { success: true, room, spectator: false };
    }
    
    // Leave a room
    leaveRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            return false;
        }
        
        // Remove from players or spectators
        room.players.delete(playerId);
        room.spectators.delete(playerId);
        
        // If host left, assign new host
        if (room.host === playerId && room.players.size > 0) {
            room.host = room.players.keys().next().value;
        }
        
        // Delete room if empty
        if (room.players.size === 0 && room.spectators.size === 0) {
            this.deleteRoom(roomId);
        } else {
            room.lastActivity = Date.now();
        }
        
        return true;
    }
    
    // Delete a room
    deleteRoom(roomId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            return false;
        }
        
        // Remove join code mapping
        this.joinCodes.delete(room.joinCode);
        
        // Delete room
        this.rooms.delete(roomId);
        
        console.log(`Room deleted: ${roomId}`);
        
        return true;
    }
    
    // Get room by ID
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    
    // Get room by join code
    getRoomByCode(joinCode) {
        const roomId = this.joinCodes.get(joinCode.toUpperCase());
        return roomId ? this.rooms.get(roomId) : null;
    }
    
    // Update room settings
    updateRoomSettings(roomId, settings) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            return false;
        }
        
        room.settings = { ...room.settings, ...settings };
        room.lastActivity = Date.now();
        
        return true;
    }
    
    // Get public rooms for lobby
    getPublicRooms() {
        const publicRooms = [];
        
        for (const [roomId, room] of this.rooms) {
            if (room.settings.isPublic && !room.gameState.started) {
                publicRooms.push({
                    id: roomId,
                    joinCode: room.joinCode,
                    players: room.players.size,
                    maxPlayers: room.settings.maxPlayers,
                    mapSize: room.settings.mapSize,
                    difficulty: room.settings.difficulty
                });
            }
        }
        
        return publicRooms;
    }
    
    // Get room count
    getRoomCount() {
        return this.rooms.size;
    }
    
    // Get total player count
    getPlayerCount() {
        let count = 0;
        for (const room of this.rooms.values()) {
            count += room.players.size;
        }
        return count;
    }
    
    // Get player color based on index
    getPlayerColor(index) {
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];
        return colors[index % colors.length];
    }
    
    // Clean up expired rooms
    cleanupExpiredRooms() {
        const now = Date.now();
        const expiryTime = this.roomExpiryMinutes * 60 * 1000;
        
        for (const [roomId, room] of this.rooms) {
            if (now - room.lastActivity > expiryTime) {
                console.log(`Cleaning up expired room: ${roomId}`);
                this.deleteRoom(roomId);
            }
        }
    }
    
    // Start cleanup interval
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupExpiredRooms();
        }, 60000); // Run every minute
    }
}