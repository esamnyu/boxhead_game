// gameSession.js - Individual game instance handler

export class GameSession {
    constructor(room, io) {
        this.room = room;
        this.io = io;
        this.roomId = room.id;
        this.tickRate = parseInt(process.env.TICK_RATE) || 60;
        this.tickInterval = 1000 / this.tickRate;
        this.running = false;
        this.lastTickTime = Date.now();
        this.gameLoop = null;
        
        // Game state
        this.gameState = {
            tick: 0,
            players: new Map(),
            enemies: new Map(),
            bullets: new Map(),
            powerups: new Map(),
            wave: 1,
            enemiesRemaining: 0,
            nextEnemyId: 1,
            nextBulletId: 1,
            nextPowerupId: 1
        };
        
        // Player inputs buffer
        this.playerInputs = new Map();
        
        // Initialize player states
        this.initializePlayers();
    }
    
    // Initialize player states
    initializePlayers() {
        let spawnIndex = 0;
        const spawnPoints = this.getSpawnPoints();
        
        for (const [playerId, playerData] of this.room.players) {
            const spawn = spawnPoints[spawnIndex % spawnPoints.length];
            
            this.gameState.players.set(playerId, {
                id: playerId,
                x: spawn.x,
                y: spawn.y,
                angle: 0,
                health: 100,
                maxHealth: 100,
                weapon: 'pistol',
                ammo: -1, // Infinite for pistol
                speed: 4,
                width: 30,
                height: 30,
                score: 0,
                kills: 0,
                deaths: 0,
                lastShot: 0,
                alive: true,
                respawnTimer: 0
            });
            
            this.playerInputs.set(playerId, {
                keys: {},
                mouse: { x: 0, y: 0 },
                shooting: false,
                sequence: 0
            });
            
            spawnIndex++;
        }
    }
    
    // Get spawn points based on map size
    getSpawnPoints() {
        // For now, return fixed spawn points
        // In production, these would be based on map configuration
        return [
            { x: 400, y: 300 },
            { x: 1200, y: 300 },
            { x: 400, y: 900 },
            { x: 1200, y: 900 },
            { x: 800, y: 600 },
            { x: 800, y: 300 },
            { x: 400, y: 600 },
            { x: 1200, y: 600 }
        ];
    }
    
    // Start the game session
    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastTickTime = Date.now();
        
        // Start game loop
        this.gameLoop = setInterval(() => {
            this.tick();
        }, this.tickInterval);
        
        // Spawn first wave
        this.spawnWave();
        
        console.log(`Game session started for room ${this.roomId}`);
    }
    
    // Stop the game session
    stop() {
        if (!this.running) return;
        
        this.running = false;
        
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        
        console.log(`Game session stopped for room ${this.roomId}`);
    }
    
    // Main game tick
    tick() {
        const now = Date.now();
        const deltaTime = (now - this.lastTickTime) / 1000;
        this.lastTickTime = now;
        
        // Update game state
        this.updatePlayers(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateBullets(deltaTime);
        this.updatePowerups(deltaTime);
        this.checkCollisions();
        this.checkWaveCompletion();
        
        // Send state update to all players
        this.broadcastState();
        
        // Increment tick
        this.gameState.tick++;
    }
    
    // Add player input
    addPlayerInput(playerId, input) {
        const playerInput = this.playerInputs.get(playerId);
        if (!playerInput) return;
        
        playerInput.keys = input.keys || {};
        playerInput.mouse = input.mouse || { x: 0, y: 0 };
        playerInput.shooting = input.shooting || false;
        playerInput.sequence = input.sequence || 0;
    }
    
    // Update player states
    updatePlayers(deltaTime) {
        for (const [playerId, player] of this.gameState.players) {
            const input = this.playerInputs.get(playerId);
            if (!input || !player.alive) continue;
            
            // Movement
            let dx = 0, dy = 0;
            if (input.keys.w || input.keys.ArrowUp) dy -= 1;
            if (input.keys.s || input.keys.ArrowDown) dy += 1;
            if (input.keys.a || input.keys.ArrowLeft) dx -= 1;
            if (input.keys.d || input.keys.ArrowRight) dx += 1;
            
            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                dx *= 0.707;
                dy *= 0.707;
            }
            
            // Apply movement
            player.x += dx * player.speed * deltaTime * 60;
            player.y += dy * player.speed * deltaTime * 60;
            
            // Clamp to world bounds
            player.x = Math.max(player.width/2, Math.min(1600 - player.width/2, player.x));
            player.y = Math.max(player.height/2, Math.min(1200 - player.height/2, player.y));
            
            // Update angle based on mouse position
            const angleToMouse = Math.atan2(
                input.mouse.y - player.y,
                input.mouse.x - player.x
            );
            player.angle = angleToMouse;
            
            // Handle shooting
            if (input.shooting) {
                this.playerShoot(playerId, player);
            }
        }
    }
    
    // Handle player shooting
    playerShoot(playerId, player) {
        const now = Date.now();
        const weaponCooldown = 200; // Milliseconds between shots
        
        if (now - player.lastShot < weaponCooldown) return;
        
        player.lastShot = now;
        
        // Create bullet
        const bulletId = this.nextBulletId++;
        const bullet = {
            id: bulletId,
            owner: playerId,
            x: player.x + Math.cos(player.angle) * 20,
            y: player.y + Math.sin(player.angle) * 20,
            angle: player.angle,
            speed: 10,
            damage: 25,
            width: 4,
            height: 4,
            maxDistance: 500,
            distanceTraveled: 0
        };
        
        this.gameState.bullets.set(bulletId, bullet);
    }
    
    // Update enemy states (simplified for demo)
    updateEnemies(deltaTime) {
        for (const [enemyId, enemy] of this.gameState.enemies) {
            // Find nearest player
            let nearestPlayer = null;
            let nearestDistance = Infinity;
            
            for (const player of this.gameState.players.values()) {
                if (!player.alive) continue;
                
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPlayer = player;
                }
            }
            
            if (nearestPlayer) {
                // Move towards nearest player
                const angle = Math.atan2(
                    nearestPlayer.y - enemy.y,
                    nearestPlayer.x - enemy.x
                );
                
                enemy.x += Math.cos(angle) * enemy.speed * deltaTime * 60;
                enemy.y += Math.sin(angle) * enemy.speed * deltaTime * 60;
                enemy.angle = angle;
            }
        }
    }
    
    // Update bullet states
    updateBullets(deltaTime) {
        const bulletsToRemove = [];
        
        for (const [bulletId, bullet] of this.gameState.bullets) {
            // Move bullet
            const distance = bullet.speed * deltaTime * 60;
            bullet.x += Math.cos(bullet.angle) * distance;
            bullet.y += Math.sin(bullet.angle) * distance;
            bullet.distanceTraveled += distance;
            
            // Check if bullet should be removed
            if (bullet.distanceTraveled >= bullet.maxDistance ||
                bullet.x < 0 || bullet.x > 1600 ||
                bullet.y < 0 || bullet.y > 1200) {
                bulletsToRemove.push(bulletId);
            }
        }
        
        // Remove expired bullets
        for (const bulletId of bulletsToRemove) {
            this.gameState.bullets.delete(bulletId);
        }
    }
    
    // Update powerups (placeholder)
    updatePowerups(deltaTime) {
        // TODO: Implement powerup logic
    }
    
    // Check collisions
    checkCollisions() {
        // Player-Enemy collisions
        for (const [playerId, player] of this.gameState.players) {
            if (!player.alive) continue;
            
            for (const [enemyId, enemy] of this.gameState.enemies) {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < (player.width + enemy.width) / 2) {
                    // Damage player
                    player.health -= 10;
                    if (player.health <= 0) {
                        player.alive = false;
                        player.deaths++;
                        player.respawnTimer = 3000; // 3 seconds
                    }
                }
            }
        }
        
        // Bullet-Enemy collisions
        const bulletsToRemove = [];
        const enemiesToRemove = [];
        
        for (const [bulletId, bullet] of this.gameState.bullets) {
            for (const [enemyId, enemy] of this.gameState.enemies) {
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < enemy.width / 2) {
                    // Damage enemy
                    enemy.health -= bullet.damage;
                    bulletsToRemove.push(bulletId);
                    
                    if (enemy.health <= 0) {
                        enemiesToRemove.push(enemyId);
                        
                        // Award points to player
                        const player = this.gameState.players.get(bullet.owner);
                        if (player) {
                            player.score += 100;
                            player.kills++;
                        }
                    }
                    break;
                }
            }
        }
        
        // Remove hit bullets and dead enemies
        for (const bulletId of bulletsToRemove) {
            this.gameState.bullets.delete(bulletId);
        }
        
        for (const enemyId of enemiesToRemove) {
            this.gameState.enemies.delete(enemyId);
            this.gameState.enemiesRemaining--;
        }
    }
    
    // Check if wave is complete
    checkWaveCompletion() {
        if (this.gameState.enemiesRemaining === 0) {
            this.gameState.wave++;
            this.spawnWave();
        }
    }
    
    // Spawn enemy wave
    spawnWave() {
        const enemyCount = 5 + this.gameState.wave * 2;
        this.gameState.enemiesRemaining = enemyCount;
        
        for (let i = 0; i < enemyCount; i++) {
            const angle = (Math.PI * 2 * i) / enemyCount;
            const distance = 400 + Math.random() * 200;
            
            const enemy = {
                id: this.nextEnemyId++,
                type: 'zombie',
                x: 800 + Math.cos(angle) * distance,
                y: 600 + Math.sin(angle) * distance,
                angle: 0,
                width: 40,
                height: 40,
                health: 50 + this.gameState.wave * 10,
                maxHealth: 50 + this.gameState.wave * 10,
                speed: 1 + this.gameState.wave * 0.1,
                damage: 10
            };
            
            this.gameState.enemies.set(enemy.id, enemy);
        }
    }
    
    // Broadcast game state to all players
    broadcastState() {
        const state = {
            tick: this.gameState.tick,
            players: Array.from(this.gameState.players.values()),
            enemies: Array.from(this.gameState.enemies.values()),
            bullets: Array.from(this.gameState.bullets.values()),
            powerups: Array.from(this.gameState.powerups.values()),
            wave: this.gameState.wave,
            enemiesRemaining: this.gameState.enemiesRemaining
        };
        
        this.io.to(this.roomId).emit('game-state', state);
    }
}