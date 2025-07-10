// syncManager.js - Manages synchronization between local game and server

export class SyncManager {
    constructor(game, multiplayerClient) {
        this.game = game;
        this.client = multiplayerClient;
        this.localPlayerId = null;
        this.serverState = null;
        this.interpolationBuffer = [];
        this.inputSequence = 0;
        this.lastProcessedInput = 0;
        this.playerEntities = new Map();
        this.isMultiplayer = false;
        
        // Interpolation settings
        this.interpolationDelay = 100; // 100ms buffer
        this.maxBufferSize = 60; // 1 second at 60fps
        
        // Setup client callbacks
        this.setupCallbacks();
    }
    
    // Setup multiplayer callbacks
    setupCallbacks() {
        this.client.onGameStart = (data) => {
            this.startMultiplayer(data);
        };
        
        this.client.onGameState = (state) => {
            this.receiveServerState(state);
        };
    }
    
    // Start multiplayer mode
    startMultiplayer(data) {
        this.isMultiplayer = true;
        this.localPlayerId = this.client.playerId;
        
        // Hide menu and start game
        this.game.menus.hideMenus();
        
        // Create player entities for all players
        data.players.forEach(playerData => {
            if (playerData.id === this.localPlayerId) {
                // Local player
                this.game.player.id = playerData.id;
                this.game.player.x = playerData.x;
                this.game.player.y = playerData.y;
                this.game.player.networkId = playerData.id;
                this.playerEntities.set(playerData.id, this.game.player);
            } else {
                // Remote player
                const remotePlayer = this.createRemotePlayer(playerData);
                this.playerEntities.set(playerData.id, remotePlayer);
            }
        });
        
        // Start game
        this.game.gameRunning = true;
        this.game.gameLoop.start();
    }
    
    // Create remote player entity
    createRemotePlayer(playerData) {
        const remotePlayer = {
            id: playerData.id,
            x: playerData.x,
            y: playerData.y,
            width: 30,
            height: 30,
            angle: 0,
            health: playerData.health,
            maxHealth: playerData.maxHealth,
            color: playerData.color || '#0088ff',
            name: playerData.name,
            isRemote: true,
            cellKey: null
        };
        
        // Add to grid
        this.game.grid.add(remotePlayer);
        
        return remotePlayer;
    }
    
    // Send local player input to server
    sendInput(deltaTime) {
        if (!this.isMultiplayer) return;
        
        const input = {
            sequence: ++this.inputSequence,
            keys: { ...this.game.input.keys },
            mouse: {
                x: this.game.input.mouseX + this.game.camera.x,
                y: this.game.input.mouseY + this.game.camera.y
            },
            shooting: this.game.input.mouseDown,
            deltaTime: deltaTime,
            timestamp: Date.now()
        };
        
        this.client.sendInput(input);
        
        return input;
    }
    
    // Receive server state update
    receiveServerState(state) {
        // Add to interpolation buffer
        this.interpolationBuffer.push({
            timestamp: Date.now(),
            state: state
        });
        
        // Trim buffer if too large
        if (this.interpolationBuffer.length > this.maxBufferSize) {
            this.interpolationBuffer.shift();
        }
        
        // Store latest server state
        this.serverState = state;
        
        // Update game state
        this.updateGameState(state);
    }
    
    // Update local game state from server
    updateGameState(state) {
        // Update wave info
        this.game.currentWave = state.wave;
        this.game.enemiesRemaining = state.enemiesRemaining;
        
        // Update players
        state.players.forEach(playerData => {
            if (playerData.id === this.localPlayerId) {
                // Reconcile local player (client prediction)
                this.reconcileLocalPlayer(playerData);
            } else {
                // Update remote players
                this.updateRemotePlayer(playerData);
            }
        });
        
        // Update enemies
        this.updateEnemies(state.enemies);
        
        // Update bullets
        this.updateBullets(state.bullets);
        
        // Update powerups
        this.updatePowerups(state.powerups);
    }
    
    // Reconcile local player position with server
    reconcileLocalPlayer(serverPlayer) {
        // Simple reconciliation - snap to server position if difference is too large
        const dx = Math.abs(this.game.player.x - serverPlayer.x);
        const dy = Math.abs(this.game.player.y - serverPlayer.y);
        const threshold = 50; // Snap threshold
        
        if (dx > threshold || dy > threshold) {
            // Snap to server position
            this.game.player.x = serverPlayer.x;
            this.game.player.y = serverPlayer.y;
        }
        
        // Always update health and other stats from server
        this.game.player.health = serverPlayer.health;
        this.game.player.score = serverPlayer.score;
        this.game.player.kills = serverPlayer.kills;
        this.game.player.deaths = serverPlayer.deaths;
    }
    
    // Update remote player
    updateRemotePlayer(playerData) {
        let remotePlayer = this.playerEntities.get(playerData.id);
        
        if (!remotePlayer) {
            // Create new remote player
            remotePlayer = this.createRemotePlayer(playerData);
            this.playerEntities.set(playerData.id, remotePlayer);
        }
        
        // Update position and state
        remotePlayer.targetX = playerData.x;
        remotePlayer.targetY = playerData.y;
        remotePlayer.angle = playerData.angle;
        remotePlayer.health = playerData.health;
        
        // Update grid position if needed
        this.game.grid.update(remotePlayer);
    }
    
    // Interpolate remote players
    interpolateRemotePlayers(deltaTime) {
        if (!this.isMultiplayer) return;
        
        for (const [playerId, player] of this.playerEntities) {
            if (playerId === this.localPlayerId || !player.isRemote) continue;
            
            // Smooth interpolation to target position
            if (player.targetX !== undefined) {
                const lerpFactor = 0.2;
                player.x += (player.targetX - player.x) * lerpFactor;
                player.y += (player.targetY - player.y) * lerpFactor;
            }
        }
    }
    
    // Update enemies from server state
    updateEnemies(serverEnemies) {
        // Clear existing enemies
        this.game.enemyManager.clear();
        
        // Add server enemies
        serverEnemies.forEach(enemyData => {
            const enemy = this.game.enemyManager.getEnemy();
            Object.assign(enemy, enemyData);
            enemy.active = true;
            
            this.game.enemyManager.enemies.push(enemy);
            this.game.grid.add(enemy);
        });
    }
    
    // Update bullets from server state
    updateBullets(serverBullets) {
        // Clear existing bullets
        this.game.bulletManager.clear();
        
        // Add server bullets
        serverBullets.forEach(bulletData => {
            const bullet = this.game.bulletManager.getBulletFromPool();
            Object.assign(bullet, bulletData);
            
            this.game.bulletManager.bullets.push(bullet);
            this.game.grid.add(bullet);
        });
    }
    
    // Update powerups from server state
    updatePowerups(serverPowerups) {
        // Clear existing powerups
        this.game.powerupManager.clear();
        
        // Add server powerups
        serverPowerups.forEach(powerupData => {
            const powerup = this.game.powerupManager.getPowerupFromPool();
            Object.assign(powerup, powerupData);
            
            this.game.powerupManager.powerups.push(powerup);
            this.game.grid.add(powerup);
        });
    }
    
    // Render remote players
    renderRemotePlayers(camera) {
        if (!this.isMultiplayer) return;
        
        for (const [playerId, player] of this.playerEntities) {
            if (playerId === this.localPlayerId || !player.isRemote) continue;
            
            // Check if visible
            if (this.game.renderer.isOffscreen(player, camera)) continue;
            
            const screenX = player.x - camera.x;
            const screenY = player.y - camera.y;
            
            const ctx = this.game.renderer.ctx;
            
            // Draw player
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(player.angle);
            
            // Body
            ctx.fillStyle = player.color;
            ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
            
            // Direction indicator
            ctx.fillStyle = '#fff';
            ctx.fillRect(player.width/2 - 5, -2, 10, 4);
            
            ctx.restore();
            
            // Draw name
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, screenX, screenY - player.height/2 - 10);
            
            // Draw health bar
            if (player.health < player.maxHealth) {
                const barWidth = player.width;
                const barHeight = 4;
                const barY = screenY - player.height/2 - 25;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(screenX - barWidth/2, barY, barWidth, barHeight);
                
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(
                    screenX - barWidth/2,
                    barY,
                    barWidth * (player.health / player.maxHealth),
                    barHeight
                );
            }
        }
    }
    
    // Check if in multiplayer mode
    isInMultiplayer() {
        return this.isMultiplayer;
    }
    
    // Clean up when leaving multiplayer
    cleanup() {
        this.isMultiplayer = false;
        this.localPlayerId = null;
        this.serverState = null;
        this.interpolationBuffer = [];
        this.inputSequence = 0;
        this.lastProcessedInput = 0;
        
        // Remove remote players
        for (const [playerId, player] of this.playerEntities) {
            if (player.isRemote) {
                this.game.grid.remove(player);
                this.playerEntities.delete(playerId);
            }
        }
    }
}