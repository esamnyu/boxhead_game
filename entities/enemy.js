// enemy.js - Enemy entity and enemy management

import { CONFIG } from '../config.js';
import { checkCollision } from '../systems/collisions.js';

export class EnemyManager {
    constructor(game) {
        this.game = game;
        this.enemies = [];
        this.obstacles = [];
        this.enemyPool = []; // Object pool for enemy reuse
        this.spawnCooldown = 0;
        this.pathfindingGrid = null;
    }
    
    // Clear all enemies
    clear() {
        // Return all enemies to pool
        for (const enemy of this.enemies) {
            this.game.grid.remove(enemy);
            this.returnEnemyToPool(enemy);
        }
        this.enemies = [];
    }
    
    // Get enemy from pool or create new one
    getEnemy() {
        if (this.enemyPool.length > 0) {
            return this.enemyPool.pop();
        }
        
        return {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            health: 0,
            maxHealth: 0,
            speed: 0,
            damage: 0,
            color: '',
            type: '',
            points: 0,
            lastAttack: 0,
            attackCooldown: 1000,
            active: true,
            cellKey: null
        };
    }
    
    // Return enemy to pool
    returnEnemyToPool(enemy) {
        // Reset enemy properties
        enemy.active = false;
        
        // Add to pool for reuse
        if (this.enemyPool.length < 100) { // Limit pool size
            this.enemyPool.push(enemy);
        }
    }
    
    // Create an enemy
    createEnemy(type) {
        const enemyConfig = CONFIG.ENEMY_TYPES[type];
        
        if (!enemyConfig) {
            console.error(`Enemy type "${type}" not found`);
            return null;
        }
        
        // Choose spawn position away from player
        let spawnX, spawnY;
        const playerX = this.game.player.x;
        const playerY = this.game.player.y;
        const spawnDist = CONFIG.ENEMY_SPAWN_DISTANCE;
        
        // Generate random position around the player
        const angle = Math.random() * Math.PI * 2;
        spawnX = playerX + Math.cos(angle) * spawnDist;
        spawnY = playerY + Math.sin(angle) * spawnDist;
        
        // Clamp to world bounds
        spawnX = Math.max(enemyConfig.width, Math.min(CONFIG.WORLD_WIDTH - enemyConfig.width, spawnX));
        spawnY = Math.max(enemyConfig.height, Math.min(CONFIG.WORLD_HEIGHT - enemyConfig.height, spawnY));
        
        // Get enemy from pool
        const enemy = this.getEnemy();
        
        // Set enemy properties
        enemy.x = spawnX;
        enemy.y = spawnY;
        enemy.width = enemyConfig.width;
        enemy.height = enemyConfig.height;
        enemy.health = enemyConfig.health * (1 + (this.game.currentWave - 1) * 0.1);
        enemy.maxHealth = enemy.health;
        enemy.speed = enemyConfig.speed;
        enemy.damage = enemyConfig.damage;
        enemy.color = enemyConfig.color;
        enemy.type = type;
        enemy.points = enemyConfig.points;
        enemy.lastAttack = 0;
        enemy.attackCooldown = 1000;
        enemy.active = true;
        
        // Add to enemy list
        this.enemies.push(enemy);
        this.game.grid.add(enemy);
        this.game.enemiesRemaining++;
        
        return enemy;
    }
    
    // Create a boss enemy
    createBossEnemy(wave) {
        const bossConfig = CONFIG.ENEMY_TYPES.boss;
        
        // Increase boss stats based on wave
        const waveMultiplier = 1 + (wave - 5) * 0.2;
        
        // Choose spawn position away from player
        let spawnX, spawnY;
        const playerX = this.game.player.x;
        const playerY = this.game.player.y;
        const spawnDist = CONFIG.ENEMY_SPAWN_DISTANCE * 1.5;
        
        // Generate position directly opposite to player from the center
        const centerX = CONFIG.WORLD_WIDTH / 2;
        const centerY = CONFIG.WORLD_HEIGHT / 2;
        
        const playerAngle = Math.atan2(playerY - centerY, playerX - centerX);
        spawnX = centerX + Math.cos(playerAngle + Math.PI) * spawnDist;
        spawnY = centerY + Math.sin(playerAngle + Math.PI) * spawnDist;
        
        // Clamp to world bounds
        spawnX = Math.max(bossConfig.width, Math.min(CONFIG.WORLD_WIDTH - bossConfig.width, spawnX));
        spawnY = Math.max(bossConfig.height, Math.min(CONFIG.WORLD_HEIGHT - bossConfig.height, spawnY));
        
        // Get enemy from pool
        const boss = this.getEnemy();
        
        // Set boss properties
        boss.x = spawnX;
        boss.y = spawnY;
        boss.width = bossConfig.width;
        boss.height = bossConfig.height;
        boss.health = bossConfig.health * waveMultiplier;
        boss.maxHealth = boss.health;
        boss.speed = bossConfig.speed;
        boss.damage = bossConfig.damage * waveMultiplier;
        boss.color = bossConfig.color;
        boss.type = 'boss';
        boss.points = bossConfig.points * waveMultiplier;
        boss.lastAttack = 0;
        boss.attackCooldown = 800; // Bosses attack faster
        boss.active = true;
        
        // Add to enemy list
        this.enemies.push(boss);
        this.game.grid.add(boss);
        this.game.enemiesRemaining++;
        
        // Play boss spawn sound
        this.game.audio.play('bossSpawn');
        
        // Show boss warning
        this.game.menus.showBossWarning();
        
        return boss;
    }
    
    // Kill an enemy
    killEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        
        if (index !== -1) {
            // Award points
            this.game.score += enemy.points;
            
            // Award XP
            this.game.playerStats.addXP(enemy.points / 2);
            
            // Update enemies remaining
            this.game.enemiesRemaining--;
            
            // Create death particles
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 2;
                
                this.game.particleManager.createParticle(
                    enemy.x, enemy.y,
                    enemy.color,
                    3 + Math.random() * 2,
                    20 + Math.random() * 20,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );
            }
            
            // Chance to drop powerup
            if (Math.random() < CONFIG.POWERUP_DROP_CHANCE || enemy.type === 'boss') {
                this.game.powerupManager.createRandomPowerup(enemy.x, enemy.y);
            }
            
            // Remove from grid
            this.game.grid.remove(enemy);
            
            // Remove from enemies array
            this.enemies.splice(index, 1);
            
            // Return to pool
            this.returnEnemyToPool(enemy);
            
            // Play death sound
            this.game.audio.play('enemyDeath');
            
            // Check if wave is complete
            if (this.game.enemiesRemaining <= 0) {
                this.waveComplete();
            }
        }
    }
    
    // Wave complete
    waveComplete() {
        this.game.currentWave++;
        
        // Show wave complete message
        this.game.menus.showWaveComplete(this.game.currentWave - 1);
        
        // Save game
        this.game.saveSystem.save(this.game);
        
        // Start next wave after delay
        setTimeout(() => {
            if (this.game.gameRunning) {
                this.game.createWave();
            }
        }, 3000);
    }
    
    // Update all enemies
    update(deltaTime, player) {
        // Using a reverse loop for efficient removal
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Skip updating enemies outside culling distance
            const dist = Math.sqrt(
                Math.pow(enemy.x - player.x, 2) + 
                Math.pow(enemy.y - player.y, 2)
            );
            
            if (dist > CONFIG.CULL_DISTANCE) {
                continue;
            }
            
            // AI: Move towards player
            this.moveEnemyTowardsPlayer(enemy, player, deltaTime);
            
            // Check player collision
            const enemyRect = {
                x: enemy.x - enemy.width / 2,
                y: enemy.y - enemy.height / 2,
                width: enemy.width,
                height: enemy.height
            };
            
            const playerRect = {
                x: player.x - player.width / 2,
                y: player.y - player.width / 2,
                width: player.width,
                height: player.height
            };
            
            if (checkCollision(enemyRect, playerRect)) {
                // Attack player on collision
                const currentTime = Date.now();
                
                if (currentTime - enemy.lastAttack >= enemy.attackCooldown) {
                    player.takeDamage(enemy.damage);
                    enemy.lastAttack = currentTime;
                    
                    // Knockback player slightly
                    const knockbackAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    const knockbackForce = 5;
                    
                    player.x += Math.cos(knockbackAngle) * knockbackForce;
                    player.y += Math.sin(knockbackAngle) * knockbackForce;
                }
            }
            
            // Update enemy in grid
            this.game.grid.update(enemy);
        }
    }
    
    // Move enemy towards player with obstacle avoidance
    moveEnemyTowardsPlayer(enemy, player, deltaTime) {
        // Calculate direction to player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Store original position for collision resolution
        const originalX = enemy.x;
        const originalY = enemy.y;
        
        // Calculate base movement
        let moveX = dirX * enemy.speed;
        let moveY = dirY * enemy.speed;
        
        // Boss special movement: periodically charge at player
        if (enemy.type === 'boss') {
            const chargeTime = Date.now() % 5000;
            if (chargeTime < 1000) {
                // Charge phase
                moveX *= 2;
                moveY *= 2;
                
                // Create trail particles during charge
                if (Math.random() < 0.3) {
                    this.game.particleManager.createParticle(
                        enemy.x, enemy.y,
                        'rgba(255, 0, 0, 0.5)',
                        enemy.width / 4,
                        10,
                        (Math.random() - 0.5) * 0.5,
                        (Math.random() - 0.5) * 0.5
                    );
                }
            }
        }
        
        // Apply movement
        enemy.x += moveX;
        enemy.y += moveY;
        
        // Check for obstacle collisions
        const enemyRect = {
            x: enemy.x - enemy.width / 2,
            y: enemy.y - enemy.height / 2,
            width: enemy.width,
            height: enemy.height
        };
        
        // Use grid to get nearby obstacles for efficiency
        const nearbyObstacles = this.game.grid.getNearby(enemy, 100);
        
        for (const obj of nearbyObstacles) {
            if (!this.obstacles.includes(obj)) continue;
            
            if (checkCollision(enemyRect, obj)) {
                // Calculate overlap on each axis
                const overlapX = Math.min(
                    enemyRect.x + enemyRect.width - obj.x,
                    obj.x + obj.width - enemyRect.x
                );
                
                const overlapY = Math.min(
                    enemyRect.y + enemyRect.height - obj.y,
                    obj.y + obj.height - enemyRect.y
                );
                
                // Resolve collision by moving enemy along the axis with smaller overlap
                if (overlapX < overlapY) {
                    if (enemyRect.x < obj.x) {
                        enemy.x = obj.x - enemyRect.width;
                    } else {
                        enemy.x = obj.x + obj.width;
                    }
                } else {
                    if (enemyRect.y < obj.y) {
                        enemy.y = obj.y - enemyRect.height;
                    } else {
                        enemy.y = obj.y + obj.height;
                    }
                }
                
                // Update enemy rect after collision resolution
                enemyRect.x = enemy.x - enemy.width / 2;
                enemyRect.y = enemy.y - enemy.height / 2;
            }
        }
        
        // If there was significant obstacle collision, try to move around it
        if (Math.abs(enemy.x - originalX) < Math.abs(moveX) * 0.5 &&
            Math.abs(enemy.y - originalY) < Math.abs(moveY) * 0.5) {
            
            // Try moving horizontally
            if (Math.abs(dx) > Math.abs(dy)) {
                enemy.y = originalY;
            } 
            // Try moving vertically
            else {
                enemy.x = originalX;
            }
        }
        
        // Keep enemy within world bounds
        enemy.x = Math.max(enemy.width/2, Math.min(CONFIG.WORLD_WIDTH - enemy.width/2, enemy.x));
        enemy.y = Math.max(enemy.height/2, Math.min(CONFIG.WORLD_HEIGHT - enemy.height/2, enemy.y));
    }
}