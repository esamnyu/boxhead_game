// powerup.js - Powerup entity and management

import { CONFIG } from '../config.js';

export class PowerupManager {
    constructor(game) {
        this.game = game;
        this.powerups = [];
        this.powerupPool = []; // Object pool for powerup reuse
    }
    
    // Clear all powerups
    clear() {
        // Return all powerups to pool
        for (const powerup of this.powerups) {
            this.game.grid.remove(powerup);
            this.returnPowerupToPool(powerup);
        }
        this.powerups = [];
    }
    
    // Get powerup from pool or create new one
    getPowerup() {
        if (this.powerupPool.length > 0) {
            return this.powerupPool.pop();
        }
        
        return {
            x: 0,
            y: 0,
            radius: 15,
            type: '',
            color: '',
            effect: null,
            lifetime: 600, // 10 seconds at 60fps
            active: true,
            cellKey: null
        };
    }
    
    // Return powerup to pool
    returnPowerupToPool(powerup) {
        // Reset powerup properties
        powerup.active = false;
        
        // Add to pool for reuse
        if (this.powerupPool.length < 20) { // Limit pool size
            this.powerupPool.push(powerup);
        }
    }
    
    // Create a powerup
    createPowerup(x, y, powerupConfig) {
        const powerup = this.getPowerup();
        
        powerup.x = x;
        powerup.y = y;
        powerup.radius = 15;
        powerup.type = powerupConfig.type;
        powerup.color = powerupConfig.color;
        powerup.effect = powerupConfig.effect;
        powerup.lifetime = 600; // 10 seconds at 60fps
        powerup.active = true;
        
        this.powerups.push(powerup);
        this.game.grid.add(powerup);
        
        return powerup;
    }
    
    // Create random powerup
    createRandomPowerup(x, y) {
        const powerupTypes = CONFIG.POWERUP_TYPES;
        const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        
        // Skip weapon powerups if player already has all weapons
        if (randomType.type === 'weapon' && this.game.player.weapon !== 'Pistol') {
            // Check if ammo is low - give ammo instead of a new weapon
            if (this.game.player.ammo < CONFIG.WEAPONS[this.game.player.weapon].ammo * 0.3) {
                // Find ammo powerup
                const ammoPowerup = powerupTypes.find(p => p.type === 'ammo');
                if (ammoPowerup) {
                    return this.createPowerup(x, y, ammoPowerup);
                }
            }
        }
        
        return this.createPowerup(x, y, randomType);
    }
    
    // Update all powerups
    update(deltaTime, player, game) {
        // Using a reverse loop for efficient removal
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            
            // Update lifetime
            powerup.lifetime--;
            
            // Remove expired powerups
            if (powerup.lifetime <= 0) {
                this.game.grid.remove(powerup);
                this.returnPowerupToPool(powerup);
                this.powerups.splice(i, 1);
                continue;
            }
            
            // Create glowing particles occasionally
            if (powerup.lifetime % 10 === 0) {
                const angle = Math.random() * Math.PI * 2;
                
                this.game.particleManager.createParticle(
                    powerup.x + Math.cos(angle) * powerup.radius,
                    powerup.y + Math.sin(angle) * powerup.radius,
                    powerup.color,
                    2 + Math.random() * 2,
                    10 + Math.random() * 10,
                    Math.cos(angle) * 0.3,
                    Math.sin(angle) * 0.3
                );
            }
            
            // Check collision with player
            const dx = powerup.x - player.x;
            const dy = powerup.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < powerup.radius + player.width / 2) {
                // Apply powerup effect
                powerup.effect(player, game);
                
                // Create pickup particles
                for (let j = 0; j < 15; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 2;
                    
                    this.game.particleManager.createParticle(
                        powerup.x, powerup.y,
                        powerup.color,
                        3 + Math.random() * 2,
                        15 + Math.random() * 15,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed
                    );
                }
                
                // Remove powerup
                this.game.grid.remove(powerup);
                this.returnPowerupToPool(powerup);
                this.powerups.splice(i, 1);
                
                // Update HUD
                this.game.hud.update(this.game);
            }
        }
    }
    
    // Create special powerup for new wave
    createWavePowerup() {
        // Find a free spot away from obstacles
        let x, y, validPosition = false;
        
        while (!validPosition) {
            x = 100 + Math.random() * (CONFIG.WORLD_WIDTH - 200);
            y = 100 + Math.random() * (CONFIG.WORLD_HEIGHT - 200);
            
            // Check distance to obstacles
            const nearbyObstacles = this.game.grid.getNearby({
                x, y, width: 40, height: 40
            }, 50);
            
            validPosition = nearbyObstacles.length === 0;
        }
        
        // Determine powerup type based on player status
        let powerupType;
        
        if (this.game.player.health < this.game.player.maxHealth * 0.5) {
            // Player has low health, give health powerup
            powerupType = CONFIG.POWERUP_TYPES.find(p => p.type === 'health');
        } else if (this.game.player.weapon === 'Pistol') {
            // Player has only pistol, give weapon powerup
            powerupType = CONFIG.POWERUP_TYPES.find(p => p.type === 'weapon');
        } else {
            // Otherwise random, but weighted towards what player needs
            const healthWeight = 1 - (this.game.player.health / this.game.player.maxHealth);
            const ammoWeight = this.game.player.weapon !== 'Pistol' ? 
                1 - (this.game.player.ammo / CONFIG.WEAPONS[this.game.player.weapon].ammo) : 0;
            
            const weights = [
                { type: 'health', weight: healthWeight + 0.2 },
                { type: 'weapon', weight: 0.3 },
                { type: 'speed', weight: 0.2 },
                { type: 'ammo', weight: ammoWeight + 0.1 }
            ];
            
            // Normalize weights
            const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
            let randomValue = Math.random() * totalWeight;
            
            for (const entry of weights) {
                if (randomValue < entry.weight) {
                    powerupType = CONFIG.POWERUP_TYPES.find(p => p.type === entry.type);
                    break;
                }
                randomValue -= entry.weight;
            }
            
            // Fallback if no powerup was selected
            if (!powerupType) {
                powerupType = CONFIG.POWERUP_TYPES[0];
            }
        }
        
        // Create the powerup
        const powerup = this.createPowerup(x, y, powerupType);
        
        // Make it last longer
        powerup.lifetime = 1200; // 20 seconds
        
        // Make it more visible with extra particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30;
            
            this.game.particleManager.createParticle(
                powerup.x + Math.cos(angle) * distance,
                powerup.y + Math.sin(angle) * distance,
                powerup.color,
                4 + Math.random() * 3,
                30 + Math.random() * 20,
                Math.cos(angle) * 0.5,
                Math.sin(angle) * 0.5
            );
        }
        
        return powerup;
    }
}