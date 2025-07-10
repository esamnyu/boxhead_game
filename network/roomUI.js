// roomUI.js - Multiplayer room UI components

export class RoomUI {
    constructor(multiplayerClient) {
        this.client = multiplayerClient;
        this.container = null;
        this.elements = {};
        
        this.createUI();
        this.bindEvents();
    }
    
    // Create UI elements
    createUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'multiplayer-ui';
        this.container.className = 'multiplayer-ui';
        this.container.innerHTML = `
            <!-- Main Menu -->
            <div id="mp-main-menu" class="mp-panel">
                <h2>Multiplayer</h2>
                <input type="text" id="player-name" placeholder="Enter your name" maxlength="20" />
                <div class="mp-buttons">
                    <button id="create-room-btn" class="mp-btn primary">Create Room</button>
                    <button id="join-room-btn" class="mp-btn">Join Room</button>
                    <button id="back-to-menu-btn" class="mp-btn secondary">Back</button>
                </div>
            </div>
            
            <!-- Create Room Panel -->
            <div id="mp-create-room" class="mp-panel" style="display: none;">
                <h2>Create Room</h2>
                <div class="mp-settings">
                    <label>
                        Max Players:
                        <select id="max-players">
                            <option value="2">2</option>
                            <option value="4" selected>4</option>
                            <option value="6">6</option>
                            <option value="8">8</option>
                        </select>
                    </label>
                    <label>
                        Map Size:
                        <select id="map-size">
                            <option value="small">Small</option>
                            <option value="medium" selected>Medium</option>
                            <option value="large">Large</option>
                        </select>
                    </label>
                    <label>
                        Difficulty:
                        <select id="difficulty">
                            <option value="easy">Easy</option>
                            <option value="normal" selected>Normal</option>
                            <option value="hard">Hard</option>
                        </select>
                    </label>
                    <label>
                        <input type="checkbox" id="public-room" />
                        Public Room
                    </label>
                </div>
                <div class="mp-buttons">
                    <button id="confirm-create-btn" class="mp-btn primary">Create</button>
                    <button id="cancel-create-btn" class="mp-btn secondary">Cancel</button>
                </div>
            </div>
            
            <!-- Join Room Panel -->
            <div id="mp-join-room" class="mp-panel" style="display: none;">
                <h2>Join Room</h2>
                <input type="text" id="join-code" placeholder="Enter join code" maxlength="6" style="text-transform: uppercase;" />
                <div class="mp-buttons">
                    <button id="confirm-join-btn" class="mp-btn primary">Join</button>
                    <button id="cancel-join-btn" class="mp-btn secondary">Cancel</button>
                </div>
            </div>
            
            <!-- Room Lobby -->
            <div id="mp-lobby" class="mp-panel" style="display: none;">
                <h2>Room Lobby</h2>
                <div class="room-info">
                    <p>Join Code: <span id="room-code" class="highlight"></span></p>
                    <p>Players: <span id="player-count"></span></p>
                </div>
                <div id="player-list" class="player-list"></div>
                <div class="chat-container">
                    <div id="chat-messages" class="chat-messages"></div>
                    <input type="text" id="chat-input" placeholder="Type a message..." maxlength="100" />
                </div>
                <div class="mp-buttons">
                    <button id="ready-btn" class="mp-btn primary">Ready</button>
                    <button id="start-game-btn" class="mp-btn primary" style="display: none;">Start Game</button>
                    <button id="leave-room-btn" class="mp-btn secondary">Leave Room</button>
                </div>
            </div>
            
            <!-- Connection Status -->
            <div id="connection-status" class="connection-status">
                <span class="status-icon">●</span>
                <span class="status-text">Disconnected</span>
                <span class="latency"></span>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Store element references
        this.elements = {
            mainMenu: document.getElementById('mp-main-menu'),
            createRoom: document.getElementById('mp-create-room'),
            joinRoom: document.getElementById('mp-join-room'),
            lobby: document.getElementById('mp-lobby'),
            playerName: document.getElementById('player-name'),
            joinCode: document.getElementById('join-code'),
            roomCode: document.getElementById('room-code'),
            playerCount: document.getElementById('player-count'),
            playerList: document.getElementById('player-list'),
            chatMessages: document.getElementById('chat-messages'),
            chatInput: document.getElementById('chat-input'),
            readyBtn: document.getElementById('ready-btn'),
            startGameBtn: document.getElementById('start-game-btn'),
            connectionStatus: document.getElementById('connection-status')
        };
    }
    
    // Add CSS styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .multiplayer-ui {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.8);
                z-index: 1000;
                font-family: Arial, sans-serif;
            }
            
            .mp-panel {
                background: #222;
                border: 2px solid #444;
                border-radius: 10px;
                padding: 30px;
                min-width: 400px;
                color: white;
            }
            
            .mp-panel h2 {
                margin: 0 0 20px 0;
                text-align: center;
                color: #4CAF50;
            }
            
            .mp-panel input[type="text"] {
                width: 100%;
                padding: 10px;
                margin: 10px 0;
                background: #333;
                border: 1px solid #555;
                border-radius: 5px;
                color: white;
                font-size: 16px;
            }
            
            .mp-buttons {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            
            .mp-btn {
                flex: 1;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .mp-btn.primary {
                background: #4CAF50;
                color: white;
            }
            
            .mp-btn.primary:hover {
                background: #45a049;
            }
            
            .mp-btn.secondary {
                background: #666;
                color: white;
            }
            
            .mp-btn.secondary:hover {
                background: #555;
            }
            
            .mp-settings {
                margin: 20px 0;
            }
            
            .mp-settings label {
                display: block;
                margin: 10px 0;
            }
            
            .mp-settings select {
                margin-left: 10px;
                padding: 5px;
                background: #333;
                border: 1px solid #555;
                color: white;
                border-radius: 3px;
            }
            
            .room-info {
                margin-bottom: 20px;
                text-align: center;
            }
            
            .room-info p {
                margin: 5px 0;
            }
            
            .highlight {
                color: #4CAF50;
                font-weight: bold;
                font-size: 20px;
                letter-spacing: 2px;
            }
            
            .player-list {
                background: #333;
                border-radius: 5px;
                padding: 10px;
                margin: 20px 0;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .player-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 10px;
                margin: 5px 0;
                background: #444;
                border-radius: 3px;
            }
            
            .player-item.host::after {
                content: "👑";
                margin-left: 5px;
            }
            
            .player-item.ready {
                border-left: 3px solid #4CAF50;
            }
            
            .chat-container {
                margin: 20px 0;
            }
            
            .chat-messages {
                background: #333;
                border-radius: 5px;
                padding: 10px;
                height: 150px;
                overflow-y: auto;
                margin-bottom: 10px;
            }
            
            .chat-message {
                margin: 5px 0;
                word-wrap: break-word;
            }
            
            .chat-message .player-name {
                color: #4CAF50;
                font-weight: bold;
            }
            
            .connection-status {
                position: absolute;
                top: 20px;
                right: 20px;
                background: #333;
                padding: 10px 20px;
                border-radius: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .status-icon {
                font-size: 12px;
            }
            
            .status-icon.connected {
                color: #4CAF50;
            }
            
            .status-icon.disconnected {
                color: #f44336;
            }
            
            .latency {
                color: #888;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Bind UI events
    bindEvents() {
        // Main menu
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.showPanel('create-room');
        });
        
        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.showPanel('join-room');
        });
        
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            this.hide();
        });
        
        // Create room
        document.getElementById('confirm-create-btn').addEventListener('click', () => {
            this.createRoom();
        });
        
        document.getElementById('cancel-create-btn').addEventListener('click', () => {
            this.showPanel('main-menu');
        });
        
        // Join room
        document.getElementById('confirm-join-btn').addEventListener('click', () => {
            this.joinRoom();
        });
        
        document.getElementById('cancel-join-btn').addEventListener('click', () => {
            this.showPanel('main-menu');
        });
        
        // Lobby
        document.getElementById('ready-btn').addEventListener('click', () => {
            this.toggleReady();
        });
        
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        // Chat
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
        
        // Client events
        this.client.onConnect = () => this.updateConnectionStatus(true);
        this.client.onDisconnect = () => this.updateConnectionStatus(false);
        this.client.onRoomUpdate = (room) => this.updateLobby(room);
        this.client.onChatMessage = (data) => this.addChatMessage(data);
        this.client.onGameStart = () => this.hide();
    }
    
    // Show UI
    show() {
        this.container.style.display = 'flex';
        this.showPanel('main-menu');
        
        // Restore player name
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            this.elements.playerName.value = savedName;
        }
    }
    
    // Hide UI
    hide() {
        this.container.style.display = 'none';
    }
    
    // Show specific panel
    showPanel(panelName) {
        const panels = ['main-menu', 'create-room', 'join-room', 'lobby'];
        panels.forEach(name => {
            const panel = document.getElementById(`mp-${name}`);
            panel.style.display = name === panelName ? 'block' : 'none';
        });
    }
    
    // Create room
    async createRoom() {
        const playerName = this.elements.playerName.value.trim() || 'Player';
        localStorage.setItem('playerName', playerName);
        
        const settings = {
            maxPlayers: parseInt(document.getElementById('max-players').value),
            mapSize: document.getElementById('map-size').value,
            difficulty: document.getElementById('difficulty').value,
            isPublic: document.getElementById('public-room').checked
        };
        
        try {
            const response = await this.client.createRoom(playerName, settings);
            this.showPanel('lobby');
            this.updateLobby(response.room);
        } catch (error) {
            alert('Failed to create room: ' + error.message);
        }
    }
    
    // Join room
    async joinRoom() {
        const playerName = this.elements.playerName.value.trim() || 'Player';
        const joinCode = this.elements.joinCode.value.trim().toUpperCase();
        
        if (!joinCode) {
            alert('Please enter a join code');
            return;
        }
        
        localStorage.setItem('playerName', playerName);
        
        try {
            const response = await this.client.joinRoom(joinCode, playerName);
            this.showPanel('lobby');
            this.updateLobby(response.room);
        } catch (error) {
            alert('Failed to join room: ' + error.message);
        }
    }
    
    // Leave room
    async leaveRoom() {
        try {
            await this.client.leaveRoom();
            this.showPanel('main-menu');
        } catch (error) {
            alert('Failed to leave room: ' + error.message);
        }
    }
    
    // Toggle ready status
    toggleReady() {
        const btn = this.elements.readyBtn;
        const isReady = btn.textContent === 'Ready';
        this.client.setReady(!isReady);
        btn.textContent = isReady ? 'Not Ready' : 'Ready';
        btn.classList.toggle('secondary', !isReady);
    }
    
    // Start game
    startGame() {
        this.client.startGame();
    }
    
    // Update lobby display
    updateLobby(room) {
        if (!room) return;
        
        // Update room info
        this.elements.roomCode.textContent = room.joinCode;
        this.elements.playerCount.textContent = `${room.players.length}/${room.settings.maxPlayers}`;
        
        // Update player list
        this.elements.playerList.innerHTML = '';
        room.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            if (player.id === room.host) playerDiv.classList.add('host');
            if (player.ready) playerDiv.classList.add('ready');
            
            playerDiv.innerHTML = `
                <span>${player.name}</span>
                <span>${player.ready ? '✓' : '○'}</span>
            `;
            
            this.elements.playerList.appendChild(playerDiv);
        });
        
        // Show/hide start button for host
        const isHost = this.client.isHost;
        const allReady = room.players.every(p => p.ready);
        this.elements.startGameBtn.style.display = 
            isHost && allReady && room.players.length >= 2 ? 'block' : 'none';
    }
    
    // Add chat message
    addChatMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `
            <span class="player-name">${data.playerName}:</span> ${data.message}
        `;
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
    
    // Send chat message
    sendChatMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message) return;
        
        this.client.sendChatMessage(message);
        this.elements.chatInput.value = '';
    }
    
    // Update connection status
    updateConnectionStatus(connected) {
        const statusIcon = this.elements.connectionStatus.querySelector('.status-icon');
        const statusText = this.elements.connectionStatus.querySelector('.status-text');
        const latencySpan = this.elements.connectionStatus.querySelector('.latency');
        
        statusIcon.className = `status-icon ${connected ? 'connected' : 'disconnected'}`;
        statusText.textContent = connected ? 'Connected' : 'Disconnected';
        
        if (connected) {
            setInterval(() => {
                const latency = this.client.getLatency();
                latencySpan.textContent = `${latency}ms`;
            }, 1000);
        } else {
            latencySpan.textContent = '';
        }
    }
}