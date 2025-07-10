// bullet.js - Bullet entity and bullet manager

import { CONFIG } from '../config.js';
import { checkCollision } from '../systems/collisions.js';
import { rectPool } from '../utils/objectPool.js';

export class BulletManager {
    constructor(game) {
        this.game = game;
        this.bullets = [];
        this.bulletPool = []; // Object pool for bullet reuse
    }
    
    // Clear all bullets
    clear() {
        // Return all bullets to pool
        for (const bullet of this.bullets) {
            this.game.grid.remove(bullet);
            this.returnBulletToPool(bullet);
        }
        this.bullets = [];
    }
    
    // Get bullet from pool or create new one
    getBullet() {
        if (this.bulletPool.length > 0) {
            return this.bulletPool.pop();
        }
        
        return {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            angle: 0,
            speed: 0,
            damage: 0,
            color: '',
            knockback: 0,
            owner: '',
            isGrenade: false,
            explosion: null,
            timer: 0,
            active: true
        };
    }
    
    // Return bullet to pool
    returnBulletToPool(bullet) {
        // Reset bullet properties
        bullet.active = false;
        
        // Add to pool for reuse
        if (this.bulletPool.length < 100) { // Limit pool size
            this.bulletPool.push(bullet);
        }
    }
    
    // Create a bullet
    createBullet(player, angle, weaponData) {
        if (weaponData.bullets) {
            // Multi-bullet weapon (shotgun)
            for (let i = 0; i < weaponData.bullets; i++) {
                const spreadAngle = angle + (Math.random() * weaponData.spread * 2 - weaponData.spread);
                this.createSingleBullet(player, spreadAngle, weaponData);
            }
        } else if (weaponData.explosion) {
            // Grenade launcher
            const bullet = this.getBullet();
            
            bullet.x = player.x;
            bullet.y = player.y;
            bullet.width = weaponData.bulletSize;
            bullet.height = weaponData.bulletSize;
            bullet.angle = angle;
            bullet.speed = weaponData.bulletSpeed;
            bullet.damage = weaponData.damage * player.damageMultiplier;
            bullet.color = weaponData.bulletColor;
            bullet.knockback = 0;
            bullet.owner = 'player';
            bullet.isGrenade = true;
            bullet.explosion = weaponData.explosion;
            bullet.timer = 30; // Explodes after 30 frames
            bullet.active = true;
            
            this.bullets.push(bullet);
            this.game.grid.add(bullet);
            
            // Create muzzle flash
            this.createMuzzleFlash(player.x, player.y, angle);
        } else {
            // Single bullet weapon
            this.createSingleBullet(player, angle, weaponData);
        }
    }
    
    // Create a single bullet
    createSingleBullet(player, angle, weaponData) {
        const bullet = this.getBullet();
        
        bullet.x = player.x;
        bullet.y = player.y;
        bullet.width = weaponData.bulletSize;
        bullet.height = weaponData.bulletSize;
        bullet.angle = angle;
        bullet.speed = weaponData.bulletSpeed;
        bullet.damage = weaponData.damage * player.damageMultiplier;
        bullet.color = weaponData.bulletColor;
        bullet.knockback = weaponData.knockback || 0;
        bullet.owner = 'player';
        bullet.isGrenade = false;
        bullet.explosion = null;
        bullet.active = true;
        
        this.bullets.push(bullet);
        this.game.grid.add(bullet);
        
        // Create muzzle flash
        this.createMuzzleFlash(player.x, player.y, angle);
    }
    
    // Create muzzle flash particles
    createMuzzleFlash(x, y, angle) {
        const particleCount = 5;
        
        for (let i = 0; i < particleCount; i++) {
            const particleAngle = angle + (Math.random() * 0.5 - 0.25);
            const distance = 10 + Math.random() * 10;
            
            this.game.particleManager.createParticle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                ['yellow', 'orange'][Math.floor(Math.random() * 2)],
                2 + Math.random() * 3,
                5 + Math.random() * 5,
                Math.cos(particleAngle) * (1 + Math.random()),
                Math.sin(particleAngle) * (1 + Math.random())
            );
        }
    }
    
    // Create explosion
    createExplosion(x, y, radius, damage) {
        // Cap particle count to prevent lag
        const particleCount = Math.min(50, Math.floor(radius / 2));
        
        // Create explosion particles
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const lifetime = 20 + Math.random() * 40;
            
            this.game.particleManager.createParticle(
                x + Math.cos(angle) * distance * 0.5,
                y + Math.sin(angle) * distance * 0.5,
                ['orange', 'red', 'yellow'][Math.floor(Math.random() * 3)],
                3 + Math.random() * 5,
                lifetime,
                Math.cos(angle) * (Math.random() * 3),
                Math.sin(angle) * (Math.random() * 3)
            );
        }
        
        // Damage nearby enemies
        const nearbyEnemies = this.game.grid.getNearby({x, y, width: radius*2, height: radius*2}, radius);
        
        for (const obj of nearbyEnemies) {
            if (!this.game.enemyManager.enemies.includes(obj)) continue;
            
            const enemy = obj;
            const dist = Math.sqrt(
                Math.pow(enemy.x - x, 2) + 
                Math.pow(enemy.y - y, 2)
            );
            
            if (dist <= radius) {
                // Calculate damage based on distance from explosion center
                const damageMultiplier = 1 - (dist / radius);
                const explosionDamage = damage * damageMultiplier;
                
                // Apply damage
                enemy.health -= explosionDamage;
                
                // Knockback
                const knockbackAngle = Math.atan2(enemy.y - y, enemy.x - x);
                const knockbackForce = 10 * damageMultiplier;
                
                enemy.x += Math.cos(knockbackAngle) * knockbackForce;
                enemy.y += Math.sin(knockbackAngle) * knockbackForce;
                
                // Check if enemy is dead
                if (enemy.health <= 0) {
                    this.game.enemyManager.killEnemy(enemy);
                }
            }
        }
        
        // Damage player if in radius
        const playerDist = Math.sqrt(
            Math.pow(this.game.player.x - x, 2) + 
            Math.pow(this.game.player.y - y, 2)
        );
        
        if (playerDist <= radius) {
            const damageMultiplier = 1 - (playerDist / radius);
            const explosionDamage = damage * damageMultiplier * 0.5; // Reduced self-damage
            
            this.game.player.takeDamage(explosionDamage);
            
            // Knockback player
            const knockbackAngle = Math.atan2(this.game.player.y - y, this.game.player.x - x);
            const knockbackForce = 15 * damageMultiplier;
            
            this.game.player.x += Math.cos(knockbackAngle) * knockbackForce;
            this.game.player.y += Math.sin(knockbackAngle) * knockbackForce;
        }
        
        // Play sound
        this.game.audio.play('explosion');
    }
    
    // Update all bullets
    update(deltaTime) {
        // Pre-allocate rectangles for collision detection
        const enemyRects = new Map();
        // Using a reverse loop for efficient removal
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            if (bullet.isGrenade) {
                // Update grenade timer
                bullet.timer--;
                
                if (bullet.timer <= 0) {
                    // Explode
                    this.createExplosion(bullet.x, bullet.y, bullet.explosion.radius, bullet.explosion.damage * this.game.player.damageMultiplier);
                    
                    // Remove bullet
                    this.game.grid.remove(bullet);
                    this.returnBulletToPool(bullet);
                    this.bullets.splice(i, 1);
                    continue;
                }
                
                // Slow down grenade
                bullet.speed *= 0.95;
            }
            
            // Move bullet
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;
            
            // Remove bullets out of world
            if (
                bullet.x < 0 ||
                bullet.x > CONFIG.WORLD_WIDTH ||
                bullet.y < 0 ||
                bullet.y > CONFIG.WORLD_HEIGHT
            ) {
                this.game.grid.remove(bullet);
                this.returnBulletToPool(bullet);
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Update bullet in grid
            this.game.grid.update(bullet);
            
            // Check bullet collisions with nearby objects
            const nearbyObjects = this.game.grid.getNearby(bullet, 50);
            let bulletRemoved = false;
            
            // Get bullet rect from pool
            const bulletRect = rectPool.getForEntity(bullet);
            
            for (const obj of nearbyObjects) {
                if (obj === bullet) continue;
                
                // Check bullet-obstacle collisions
                if (this.game.enemyManager.obstacles.includes(obj)) {
                    if (checkCollision(bulletRect, obj)) {
                        if (bullet.isGrenade) {
                            // Grenades explode on impact
                            this.createExplosion(bullet.x, bullet.y, bullet.explosion.radius, bullet.explosion.damage * this.game.player.damageMultiplier);
                        }
                        
                        // Remove bullet
                        this.game.grid.remove(bullet);
                        this.returnBulletToPool(bullet);
                        this.bullets.splice(i, 1);
                        bulletRemoved = true;
                        break;
                    }
                }
                
                // Check bullet-enemy collisions
                if (!bulletRemoved && obj.entityType === 'enemy' && bullet.owner === 'player') {
                    const enemy = obj;
                    
                    // Get or create enemy rect
                    let enemyRect = enemyRects.get(enemy);
                    if (!enemyRect) {
                        enemyRect = rectPool.getForEntity(enemy);
                        enemyRects.set(enemy, enemyRect);
                    }
                    
                    if (checkCollision(bulletRect, enemyRect)) {
                        if (bullet.isGrenade) {
                            // Grenades explode on impact
                            this.createExplosion(bullet.x, bullet.y, bullet.explosion.radius, bullet.explosion.damage * this.game.player.damageMultiplier);
                            this.game.grid.remove(bullet);
                            this.returnBulletToPool(bullet);
                            this.bullets.splice(i, 1);
                            bulletRemoved = true;
                            break;
                        }
                        
                        // Damage enemy
                        enemy.health -= bullet.damage;
                        
                        // Knockback
                        if (bullet.knockback > 0) {
                            const knockbackAngle = bullet.angle;
                            enemy.x += Math.cos(knockbackAngle) * bullet.knockback;
                            enemy.y += Math.sin(knockbackAngle) * bullet.knockback;
                        }
                        
                        // Create blood particles
                        this.game.particleManager.createBloodSplatter(bullet.x, bullet.y);
                        
                        // Remove bullet
                        this.game.grid.remove(bullet);
                        this.returnBulletToPool(bullet);
                        this.bullets.splice(i, 1);
                        bulletRemoved = true;
                        
                        // Check if enemy is dead
                        if (enemy.health <= 0) {
                            this.game.enemyManager.killEnemy(enemy);
                        }
                        
                        break;
                    }
                }
            }
        }
        
        // Release all rectangles back to pool
        rectPool.releaseAll();
    }
}