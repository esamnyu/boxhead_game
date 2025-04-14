// player.js - Player entity and related functionality

import { CONFIG } from '../config.js';
import { checkCollision } from '../systems/collisions.js';

export class Player {
    constructor(game) {
        this.game = game;
        
        // Position and dimensions
        this.x = CONFIG.WORLD_WIDTH / 2;
        this.y = CONFIG.WORLD_HEIGHT / 2;
        this.width = 30;
        this.height = 30;
        
        // Movement
        this.speed = 4;
        this.baseSpeed = 4;
        this.speedBoost = 0;
        this.speedBoostDuration = 0;
        
        // Stats
        this.health = 100;
        this.maxHealth = 100;
        
        // Weapon and combat
        this.weapon = 'Pistol';
        this.lastShot = 0;
        this.ammo = Infinity;
        this.damageMultiplier = 1;
        this.fireRateMultiplier = 1;
        
        // Grid management
        this.cellKey = null;
    }
    
    // Reset player to default state
    reset() {
        this.x = CONFIG.WORLD_WIDTH / 2;
        this.y = CONFIG.WORLD_HEIGHT / 2;
        this.health = 100;
        this.maxHealth = 100;
        this.weapon = 'Pistol';
        this.ammo = Infinity;
        this.speedBoost = 0;
        this.speedBoostDuration = 0;
        this.damageMultiplier = 1;
        this.fireRateMultiplier = 1;
    }
    
    // Update player
    update(deltaTime, input, grid, obstacles) {
        // Update player speed
        this.speed = this.baseSpeed;
        
        // Apply speed boost if active
        if (this.speedBoostDuration > 0) {
            this.speed += this.speedBoost;
            this.speedBoostDuration--;
            
            // Create speed particles
            if (Math.random() < 0.2) {
                this.game.particleManager.createParticle(
                    this.x, this.y,
                    '#3498db',
                    this.width / 4,
                    10,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5
                );
            }
        }
        
        // Store previous position for collision handling
        const prevX = this.x;
        const prevY = this.y;
        
        // Update player position based on input
        if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('w') || input.isKeyPressed('W')) {
            this.y -= this.speed;
        }
        if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('s') || input.isKeyPressed('S')) {
            this.y += this.speed;
        }
        if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('a') || input.isKeyPressed('A')) {
            this.x -= this.speed;
        }
        if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('d') || input.isKeyPressed('D')) {
            this.x += this.speed;
        }
        
        // Keep player within world bounds
        this.x = Math.max(this.width/2, Math.min(CONFIG.WORLD_WIDTH - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(CONFIG.WORLD_HEIGHT - this.height/2, this.y));
        
        // Check obstacle collisions
        const playerRect = {
            x: this.x - this.width/2,
            y: this.y - this.height/2,
            width: this.width,
            height: this.height
        };
        
        // Use grid to get nearby obstacles for efficiency
        const nearbyObstacles = grid.getNearby(this, 100);
        
        for (const obj of nearbyObstacles) {
            if (!obstacles.includes(obj)) continue;
            
            if (checkCollision(playerRect, obj)) {
                // Calculate overlap on each axis
                const overlapX = Math.min(
                    playerRect.x + playerRect.width - obj.x,
                    obj.x + obj.width - playerRect.x
                );
                
                const overlapY = Math.min(
                    playerRect.y + playerRect.height - obj.y,
                    obj.y + obj.height - playerRect.y
                );
                
                // Resolve collision by moving player along the axis with smaller overlap
                if (overlapX < overlapY) {
                    if (playerRect.x < obj.x) {
                        this.x = obj.x - this.width/2;
                    } else {
                        this.x = obj.x + obj.width + this.width/2;
                    }
                } else {
                    if (playerRect.y < obj.y) {
                        this.y = obj.y - this.height/2;
                    } else {
                        this.y = obj.y + obj.height + this.height/2;
                    }
                }
                
                // Update player rect after collision resolution
                playerRect.x = this.x - this.width/2;
                playerRect.y = this.y - this.height/2;
            }
        }
        
        // Shoot if shooting is active
        if (input.isShooting) {
            this.shoot(input.worldMouseX, input.worldMouseY);
        }
        
        // Update player position in grid
        grid.update(this);
    }
    
    // Handle shooting
    shoot(targetX, targetY) {
        const weaponData = CONFIG.WEAPONS[this.weapon];
        
        // Check if player has ammo
        if (this.ammo <= 0 && this.weapon !== 'Pistol') {
            // Out of ammo, switch to pistol
            this.weapon = 'Pistol';
            this.ammo = Infinity;
            this.game.hud.update(this.game);
            return;
        }
        
        // Check fire rate (adjusted by player's fire rate multiplier)
        const currentTime = Date.now();
        const adjustedFireRate = weaponData.fireRate / this.fireRateMultiplier;
        
        if (currentTime - this.lastShot < adjustedFireRate) {
            return;
        }
        
        this.lastShot = currentTime;
        
        // Decrease ammo if not infinite
        if (this.ammo !== Infinity) {
            this.ammo--;
            this.game.hud.update(this.game);
        }
        
        // Calculate angle to target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const angle = Math.atan2(dy, dx);
        
        // Play sound
        this.game.audio.play(weaponData.sound);
        
        // Create bullets based on weapon type
        this.game.bulletManager.createBullet(this, angle, weaponData);
    }
    
    // Take damage
    takeDamage(amount) {
        this.health -= amount;
        
        // Create damage indication particles
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            
            this.game.particleManager.createParticle(
                this.x, this.y,
                '#e74c3c',
                3 + Math.random() * 2,
                10 + Math.random() * 10,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
        }
        
        // Play damage sound
        this.game.audio.play('playerDamage');
        
        // Update HUD
        this.game.hud.update(this.game);
        
        // Check if player is dead
        if (this.health <= 0) {
            this.health = 0;
            this.game.gameOver();
        }
    }
    
    // Heal player
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
        this.game.hud.update(this.game);
    }
    
    // Apply speed boost
    applySpeedBoost(amount, duration) {
        this.speedBoost = amount;
        this.speedBoostDuration = duration;
    }
    
    // Change weapon
    changeWeapon(weaponName) {
        if (CONFIG.WEAPONS[weaponName]) {
            this.weapon = weaponName;
            this.ammo = CONFIG.WEAPONS[weaponName].ammo;
            this.game.hud.update(this.game);
            return true;
        }
        return false;
    }
}