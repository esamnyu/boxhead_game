// multiplayerClient.js - Socket.IO client wrapper for multiplayer

export class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.room = null;
        this.playerId = null;
        this.isHost = false;
        this.latency = 0;
        
        // Callbacks
        this.onConnect = null;
        this.onDisconnect = null;
        this.onRoomUpdate = null;
        this.onGameStart = null;
        this.onGameState = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onChatMessage = null;
        this.onError = null;
        
        // Ping tracking
        this.pingInterval = null;
        this.lastPingTime = 0;
    }
    
    // Connect to server
    connect(serverUrl = 'http://localhost:3001') {
        return new Promise((resolve, reject) => {
            // Dynamically load Socket.IO client
            const script = document.createElement('script');
            script.src = serverUrl + '/socket.io/socket.io.js';
            script.onload = () => {
                this.initializeSocket(serverUrl);
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Socket.IO client'));
            };
            document.head.appendChild(script);
        });
    }
    
    // Initialize socket connection
    initializeSocket(serverUrl) {
        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to multiplayer server');
            this.connected = true;
            this.startPingInterval();
            if (this.onConnect) this.onConnect();
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from multiplayer server');
            this.connected = false;
            this.stopPingInterval();
            if (this.onDisconnect) this.onDisconnect();
        });
        
        // Room events
        this.socket.on('room-update', (data) => {
            this.room = data.room;
            if (this.onRoomUpdate) this.onRoomUpdate(data.room);
        });
        
        this.socket.on('player-joined', (data) => {
            if (this.onPlayerJoined) this.onPlayerJoined(data);
        });
        
        this.socket.on('player-left', (data) => {
            if (this.onPlayerLeft) this.onPlayerLeft(data);
        });
        
        this.socket.on('player-ready-update', (data) => {
            if (this.room) {
                const player = this.room.players.find(p => p.id === data.playerId);
                if (player) player.ready = data.ready;
                if (this.onRoomUpdate) this.onRoomUpdate(this.room);
            }
        });
        
        this.socket.on('all-players-ready', () => {
            console.log('All players ready!');
        });
        
        // Game events
        this.socket.on('game-started', (data) => {
            console.log('Game started!');
            if (this.onGameStart) this.onGameStart(data);
        });
        
        this.socket.on('game-state', (state) => {
            if (this.onGameState) this.onGameState(state);
        });
        
        // Chat events
        this.socket.on('chat-message', (data) => {
            if (this.onChatMessage) this.onChatMessage(data);
        });
        
        // Error events
        this.socket.on('error', (error) => {
            console.error('Multiplayer error:', error);
            if (this.onError) this.onError(error);
        });
        
        // Ping response
        this.socket.on('pong', (timestamp) => {
            this.latency = Date.now() - timestamp;
        });
    }
    
    // Create a new room
    createRoom(playerName, settings = {}) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to server'));
                return;
            }
            
            this.socket.emit('create-room', {
                playerName,
                settings
            }, (response) => {
                if (response.success) {
                    this.room = response.room;
                    this.playerId = this.socket.id;
                    this.isHost = true;
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }
    
    // Join a room by code
    joinRoom(joinCode, playerName) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to server'));
                return;
            }
            
            this.socket.emit('join-room', {
                joinCode,
                playerName
            }, (response) => {
                if (response.success) {
                    this.room = response.room;
                    this.playerId = this.socket.id;
                    this.isHost = false;
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }
    
    // Leave current room
    leaveRoom() {
        return new Promise((resolve, reject) => {
            if (!this.connected || !this.room) {
                reject(new Error('Not in a room'));
                return;
            }
            
            this.socket.emit('leave-room', (response) => {
                if (response.success) {
                    this.room = null;
                    this.playerId = null;
                    this.isHost = false;
                    resolve();
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }
    
    // Set ready status
    setReady(ready) {
        if (!this.connected || !this.room) return;
        
        this.socket.emit('player-ready', { ready });
    }
    
    // Start game (host only)
    startGame() {
        if (!this.connected || !this.room || !this.isHost) return;
        
        this.socket.emit('start-game');
    }
    
    // Send game input
    sendInput(input) {
        if (!this.connected || !this.room) return;
        
        this.socket.emit('game-input', input);
    }
    
    // Send chat message
    sendChatMessage(message) {
        if (!this.connected || !this.room) return;
        
        this.socket.emit('chat-message', message);
    }
    
    // Get current latency
    getLatency() {
        return this.latency;
    }
    
    // Start ping interval
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.connected) {
                this.lastPingTime = Date.now();
                this.socket.emit('ping', this.lastPingTime);
            }
        }, 1000);
    }
    
    // Stop ping interval
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    // Disconnect from server
    disconnect() {
        this.stopPingInterval();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.room = null;
        this.playerId = null;
        this.isHost = false;
    }
}

// Export singleton instance
export const multiplayerClient = new MultiplayerClient();