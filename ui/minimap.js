// minimap.js - Minimap display for world navigation

export class Minimap {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.width = 150;
        this.height = 150;
        this.worldWidth = 3000;
        this.worldHeight = 2400;
        this.scale = 0.05; // Scale for drawing world objects on minimap
    }
    
    // Initialize minimap
    init(worldWidth, worldHeight) {
        this.container = document.getElementById('minimap-container');
        
        if (!this.container) {
            console.error('Minimap container not found');
            return false;
        }
        
        // Update world dimensions
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        
        // Calculate scale to fit minimap
        this.scale = Math.min(
            this.width / this.worldWidth,
            this.height / this.worldHeight
        );
        
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        
        // Style canvas
        this.canvas.style.display = 'block';
        
        // Add to container
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);
        
        // Resize container
        this.container.style.width = `${this.width}px`;
        this.container.style.height = `${this.height}px`;
        
        return true;
    }
    
    // Render minimap
    render(game) {
        if (!this.ctx) return;
        
        // Clear minimap
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw world border
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            0,
            0,
            this.worldWidth * this.scale,
            this.worldHeight * this.scale
        );
        
        // Draw obstacles
        this.ctx.fillStyle = '#555';
        for (const obstacle of game.enemyManager.obstacles) {
            this.ctx.fillRect(
                obstacle.x * this.scale,
                obstacle.y * this.scale,
                obstacle.width * this.scale,
                obstacle.height * this.scale
            );
        }
        
        // Draw powerups
        for (const powerup of game.powerupManager.powerups) {
            this.ctx.fillStyle = powerup.color;
            this.ctx.beginPath();
            this.ctx.arc(
                powerup.x * this.scale,
                powerup.y * this.scale,
                2, // Fixed size for visibility
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Draw enemies
        for (const enemy of game.enemyManager.enemies) {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(
                (enemy.x - enemy.width/2) * this.scale,
                (enemy.y - enemy.height/2) * this.scale,
                enemy.width * this.scale,
                enemy.height * this.scale
            );
        }
        
        // Draw player (larger for visibility)
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.beginPath();
        this.ctx.arc(
            game.player.x * this.scale,
            game.player.y * this.scale,
            3, // Larger dot for player
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw camera viewport
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            game.camera.x * this.scale,
            game.camera.y * this.scale,
            game.camera.width * this.scale,
            game.camera.height * this.scale
        );
    }
    
    // Resize minimap
    resize(width, height) {
        this.width = width;
        this.height = height;
        
        // Recalculate scale
        this.scale = Math.min(
            this.width / this.worldWidth,
            this.height / this.worldHeight
        );
        
        // Resize canvas
        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            
            // Resize container
            this.container.style.width = `${this.width}px`;
            this.container.style.height = `${this.height}px`;
        }
    }
    
    // Show minimap
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }
    
    // Hide minimap
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
    
    // Toggle minimap visibility
    toggle() {
        if (this.container) {
            if (this.container.style.display === 'none') {
                this.show();
            } else {
                this.hide();
            }
        }
    }
}