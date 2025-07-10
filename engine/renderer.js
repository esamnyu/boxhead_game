// renderer.js - Canvas rendering system

import { CONFIG } from '../config.js';
import { BatchRenderer } from './batchRenderer.js';
import { OffscreenRenderer } from './offscreenRenderer.js';

export class Renderer {
    constructor() {
        this.gameCanvas = null;
        this.ctx = null;
        this.width = 800;
        this.height = 600;
        this.debugMode = false;
        this.batchRenderer = null;
        this.offscreenRenderer = null;
    }
    
    // Initialize canvas and context
    init() {
        this.gameCanvas = document.getElementById('game-canvas');
        
        if (!this.gameCanvas) {
            console.error('Canvas element not found');
            return false;
        }
        
        this.ctx = this.gameCanvas.getContext('2d');
        
        // Initialize batch renderer
        this.batchRenderer = new BatchRenderer(this.ctx);
        
        // Initialize offscreen renderer
        this.offscreenRenderer = new OffscreenRenderer();
        
        // Set canvas dimensions
        this.resize();
        
        // Add resize event listener
        window.addEventListener('resize', this.resize.bind(this));
        
        return true;
    }
    
    // Resize canvas to fit window
    resize() {
        if (!this.gameCanvas) return;
        
        // Set canvas size to match container
        const container = this.gameCanvas.parentElement;
        
        if (container) {
            // Get container dimensions
            const containerRect = container.getBoundingClientRect();
            this.width = containerRect.width;
            this.height = containerRect.height;
        } else {
            // Fallback to window dimensions
            this.width = Math.min(window.innerWidth, 1024);
            this.height = Math.min(window.innerHeight, 768);
        }
        
        // Apply dimensions
        this.gameCanvas.width = this.width;
        this.gameCanvas.height = this.height;
    }
    
    // Clear canvas
    clear() {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    // Draw background grid
    renderGrid(camera) {
        if (!this.ctx) return;
        
        const gridSize = 100;
        
        // Pre-render grid to offscreen canvas if needed
        const gridCanvas = this.offscreenRenderer.renderGrid(
            gridSize,
            CONFIG.WORLD_WIDTH,
            CONFIG.WORLD_HEIGHT,
            'rgba(255, 255, 255, 0.05)'
        );
        
        // Draw the visible portion of the grid
        this.ctx.drawImage(
            gridCanvas,
            camera.x, camera.y,              // Source position
            this.width, this.height,         // Source dimensions
            0, 0,                           // Destination position
            this.width, this.height         // Destination dimensions
        );
    }
    
    // Render obstacles
    renderObstacles(obstacles, camera) {
        if (!this.ctx) return;
        
        for (const obstacle of obstacles) {
            // Skip rendering obstacles outside of view
            if (this.isOffscreen(obstacle, camera)) continue;
            
            const screenX = obstacle.x - camera.x;
            const screenY = obstacle.y - camera.y;
            
            this.ctx.fillStyle = obstacle.color || '#555';
            this.ctx.fillRect(screenX, screenY, obstacle.width, obstacle.height);
            
            // Draw outline
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(screenX, screenY, obstacle.width, obstacle.height);
        }
    }
    
    // Render player
    renderPlayer(player, camera, aimX, aimY) {
        if (!this.ctx) return;
        
        const screenX = player.x - camera.x;
        const screenY = player.y - camera.y;
        
        // Calculate aiming angle
        const dx = aimX - player.x;
        const dy = aimY - player.y;
        const angle = Math.atan2(dy, dx);
        
        // Draw player body
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        
        // Draw player circle
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, player.width / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw aiming direction line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
        this.ctx.stroke();
        
        // Draw weapon
        this.ctx.fillStyle = '#e67e22';
        this.ctx.save();
        this.ctx.rotate(angle);
        this.ctx.fillRect(10, -3, 15, 6);
        this.ctx.restore();
        
        // Draw speed boost effect if active
        if (player.speedBoostDuration > 0) {
            this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, player.width / 2 + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        
        // Debug: show health value
        if (this.debugMode) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`HP: ${Math.floor(player.health)}`, screenX - 15, screenY - 20);
        }
    }
    
    // Render enemies
    renderEnemies(enemies, camera) {
        if (!this.ctx) return;
        
        // First pass: batch enemy bodies by color
        for (const enemy of enemies) {
            // Skip rendering enemies outside of view
            if (this.isOffscreen(enemy, camera)) continue;
            
            const screenX = enemy.x - camera.x;
            const screenY = enemy.y - camera.y;
            
            // Add enemy to batch
            this.batchRenderer.addRect(
                enemy.color,
                screenX - enemy.width / 2,
                screenY - enemy.height / 2,
                enemy.width,
                enemy.height
            );
        }
        
        // Render all enemy bodies
        this.batchRenderer.flush();
        
        // Second pass: render health bars
        for (const enemy of enemies) {
            if (this.isOffscreen(enemy, camera)) continue;
            
            const screenX = enemy.x - camera.x;
            const screenY = enemy.y - camera.y;
            
            // Health bar
            const healthBarWidth = enemy.width;
            const healthBarHeight = 4;
            const healthPercent = enemy.health / CONFIG.ENEMY_TYPES[enemy.type].health;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(
                screenX - healthBarWidth / 2,
                screenY - enemy.height / 2 - 10,
                healthBarWidth,
                healthBarHeight
            );
            
            this.ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : (healthPercent > 0.25 ? '#f39c12' : '#e74c3c');
            this.ctx.fillRect(
                screenX - healthBarWidth / 2,
                screenY - enemy.height / 2 - 10,
                healthBarWidth * healthPercent,
                healthBarHeight
            );
        }
    }
    
    // Render bullets
    renderBullets(bullets, camera) {
        if (!this.ctx) return;
        
        for (const bullet of bullets) {
            // Skip rendering bullets outside of view
            if (this.isOffscreen(bullet, camera)) continue;
            
            const screenX = bullet.x - camera.x;
            const screenY = bullet.y - camera.y;
            
            // Draw bullet
            this.ctx.fillStyle = bullet.color;
            this.ctx.beginPath();
            
            if (bullet.isGrenade) {
                // Draw grenade as a circle
                this.ctx.arc(screenX, screenY, bullet.width / 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add grenade detail
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, bullet.width / 2, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                // Draw regular bullet
                this.ctx.arc(screenX, screenY, bullet.width / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    // Render particles
    renderParticles(particles, camera) {
        if (!this.ctx) return;
        
        // Only process particles that are on screen
        const visibleParticles = particles.filter(particle => {
            return (
                particle.x >= camera.x - particle.size &&
                particle.x <= camera.x + camera.width + particle.size &&
                particle.y >= camera.y - particle.size &&
                particle.y <= camera.y + camera.height + particle.size
            );
        });
        
        for (const particle of visibleParticles) {
            const screenX = particle.x - camera.x;
            const screenY = particle.y - camera.y;
            
            // Calculate opacity based on lifetime
            const opacity = particle.lifetime / particle.maxLifetime;
            
            // Draw particle
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = opacity;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Reset global alpha
        this.ctx.globalAlpha = 1.0;
    }
    
    // Render powerups
    renderPowerups(powerups, camera) {
        if (!this.ctx) return;
        
        for (const powerup of powerups) {
            // Skip rendering powerups outside of view
            if (this.isOffscreen(powerup, camera)) continue;
            
            const screenX = powerup.x - camera.x;
            const screenY = powerup.y - camera.y;
            
            // Draw powerup
            this.ctx.fillStyle = powerup.color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, powerup.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw glow effect
            this.ctx.strokeStyle = powerup.color;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3; // Pulsing effect
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, powerup.radius + 3, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
            
            // Draw powerup icon
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            let icon = '?';
            switch (powerup.type) {
                case 'health': icon = '+'; break;
                case 'weapon': icon = 'W'; break;
                case 'speed': icon = 'S'; break;
                case 'ammo': icon = 'A'; break;
            }
            
            this.ctx.fillText(icon, screenX, screenY);
        }
    }
    
    // Render debug info
    renderDebugInfo(game) {
        if (!this.ctx || !this.debugMode) return;
        
        const metrics = game.gameLoop.getPerformanceMetrics();
        const gridStats = `Grid Objects: ${game.grid.getObjectCount()}`;
        const particleStats = game.particleManager.getTotalParticlesCount();
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 250, 100);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        this.ctx.fillText(`FPS: ${metrics.fps} | Frame Time: ${metrics.frameTime}ms`, 20, 20);
        this.ctx.fillText(`Player Pos: ${Math.floor(game.player.x)}, ${Math.floor(game.player.y)}`, 20, 40);
        this.ctx.fillText(gridStats, 20, 60);
        this.ctx.fillText(`Particles: ${particleStats.active} / ${CONFIG.MAX_PARTICLES} (Pool: ${particleStats.pool})`, 20, 80);
    }
    
    // Toggle debug rendering
    toggleDebug() {
        this.debugMode = !this.debugMode;
    }
    
    // Helper: Check if object is offscreen
    isOffscreen(obj, camera) {
        const objLeft = obj.x - (obj.width ? obj.width / 2 : obj.radius || 0);
        const objRight = obj.x + (obj.width ? obj.width / 2 : obj.radius || 0);
        const objTop = obj.y - (obj.height ? obj.height / 2 : obj.radius || 0);
        const objBottom = obj.y + (obj.height ? obj.height / 2 : obj.radius || 0);
        
        return (
            objRight < camera.x ||
            objLeft > camera.x + camera.width ||
            objBottom < camera.y ||
            objTop > camera.y + camera.height
        );
    }
}