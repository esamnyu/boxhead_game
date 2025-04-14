// main.js - Entry point for Boxhead game

// Import modules
import { CONFIG } from './config.js';
import { InputManager } from './engine/input.js';
import { Renderer } from './engine/renderer.js';
import { GameLoop } from './engine/gameLoop.js';
import { Grid } from './systems/grid.js';
import { CollisionSystem } from './systems/collisions.js';
import { AudioSystem } from './systems/audio.js';
import { SaveSystem } from './systems/saveSystem.js';
import { Player } from './entities/player.js';
import { EnemyManager } from './entities/enemy.js';
import { BulletManager } from './entities/bullet.js';
import { PowerupManager } from './entities/powerup.js';
import { ParticleManager } from './entities/particle.js';
import { HUD } from './ui/hud.js';
import { Minimap } from './ui/minimap.js';
import { MenuManager } from './ui/menus.js';

// Main game class
class BoxheadGame {
    constructor() {
        // Game state
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.currentWave = 1;
        this.enemiesRemaining = 0;
        
        // Systems
        this.grid = new Grid(CONFIG.GRID_CELL_SIZE);
        this.input = new InputManager();
        this.renderer = new Renderer();
        this.collisions = new CollisionSystem(this.grid);
        this.audio = new AudioSystem();
        this.saveSystem = new SaveSystem();
        this.gameLoop = new GameLoop(this.update.bind(this), this.render.bind(this));
        
        // Game entities
        this.player = new Player(this);
        this.enemyManager = new EnemyManager(this);
        this.bulletManager = new BulletManager(this);
        this.powerupManager = new PowerupManager(this);
        this.particleManager = new ParticleManager();
        
        // UI
        this.hud = new HUD();
        this.minimap = new Minimap();
        this.menus = new MenuManager();
        
        // Camera
        this.camera = {
            x: 0,
            y: 0,
            width: 800,
            height: 600,
            
            update: function(target) {
                // Smooth camera follow
                const targetX = target.x - this.width / 2;
                const targetY = target.y - this.height / 2;
                
                this.x += (targetX - this.x) * 0.1;
                this.y += (targetY - this.y) * 0.1;
                
                // Clamp camera to world bounds
                this.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - this.width, this.x));
                this.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - this.height, this.y));
            }
        };
        
        // Player stats and progression
        this.playerStats = {
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            availableUpgradePoints: 0,
            upgrades: {
                health: 0,
                speed: 0,
                damage: 0,
                fireRate: 0
            },
            
            addXP: (amount) => {
                this.playerStats.xp += amount;
                
                // Check for level up
                if (this.playerStats.xp >= this.playerStats.xpToNextLevel) {
                    this.levelUp();
                }
                
                // Update UI
                this.hud.update(this);
            }
        };
        
        // Bind events
        this.bindEvents();
    }
    
    // Initialize game
    init() {
        // Initialize systems
        this.renderer.init();
        this.input.init();
        this.audio.init();
        this.hud.init();
        this.minimap.init(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.menus.init();
        
        // Update camera dimensions
        this.camera.width = this.renderer.gameCanvas.width;
        this.camera.height = this.renderer.gameCanvas.height;
        
        // Check for saved game
        if (this.saveSystem.hasSave()) {
            this.menus.showContinueButton();
        }
        
        // Update HUD
        this.hud.update(this);
    }
    
    // Start new game
    initGame() {
        // Reset game variables
        this.gameRunning = true;
        this.gamePaused = false;
        this.score = 0;
        this.currentWave = 1;
        this.enemiesRemaining = 0;
        
        // Reset player
        this.player.reset();
        
        // Reset player stats
        this.playerStats.level = 1;
        this.playerStats.xp = 0;
        this.playerStats.xpToNextLevel = 100;
        this.playerStats.upgrades = {
            health: 0,
            speed: 0,
            damage: 0,
            fireRate: 0
        };
        
        // Reset camera
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.update(this.player);
        
        // Clear entities
        this.enemyManager.clear();
        this.bulletManager.clear();
        this.powerupManager.clear();
        this.particleManager.clear();
        
        // Reset grid
        this.grid.reset();
        
        // Create obstacles
        this.createObstacles();
        
        // Create first wave
        this.createWave();
        
        // Update HUD
        this.hud.update(this);
        
        // Hide menus
        this.menus.hideMenus();
        
        // Start game loop
        this.gameLoop.start();
        
        // Play start sound
        this.audio.play('start');
    }
    
    // Continue game from save
    continueGame() {
        if (this.saveSystem.load(this)) {
            this.gameRunning = true;
            this.gamePaused = false;
            
            // Clear entities
            this.enemyManager.clear();
            this.bulletManager.clear();
            this.powerupManager.clear();
            this.particleManager.clear();
            
            // Reset grid
            this.grid.reset();
            
            // Create obstacles
            this.createObstacles();
            
            // Update camera
            this.camera.update(this.player);
            
            // Update HUD
            this.hud.update(this);
            
            // Hide menus
            this.menus.hideMenus();
            
            // Create wave
            this.createWave();
            
            // Start game loop
            this.gameLoop.start();
            
            // Play continue sound
            this.audio.play('continue');
        }
    }
    
    // Create wave
    createWave() {
        const baseEnemies = Math.floor(3 + (this.currentWave * 1.5));
        this.enemiesRemaining = 0;
        
        // Show wave announcement
        this.menus.showWaveAnnouncement(this.currentWave);
        
        // Determine enemy types based on wave
        let types = ['normal'];
        
        if (this.currentWave >= 2) types.push('fast');
        if (this.currentWave >= 3) types.push('tank');
        if (this.currentWave >= 5 && this.currentWave % 5 === 0) {
            // Boss wave every 5 waves
            this.enemyManager.createBossEnemy(this.currentWave);
            return;
        }
        
        // Create enemies with slight delay for better gameplay
        let enemiesCreated = 0;
        
        const spawnNextEnemy = () => {
            if (enemiesCreated < baseEnemies && this.gameRunning) {
                const type = types[Math.floor(Math.random() * types.length)];
                this.enemyManager.createEnemy(type);
                enemiesCreated++;
                
                // Schedule next enemy spawn
                setTimeout(spawnNextEnemy, 200 + Math.random() * 300);
            }
        };
        
        // Start spawning
        spawnNextEnemy();
    }
    
    // Create obstacles
    createObstacles() {
        this.enemyManager.obstacles.length = 0;
        
        // Create border walls around the world
        this.enemyManager.obstacles.push({
            x: -50, y: -50, width: CONFIG.WORLD_WIDTH + 100, height: 50, color: '#555' // Top wall
        });
        this.enemyManager.obstacles.push({
            x: -50, y: CONFIG.WORLD_HEIGHT, width: CONFIG.WORLD_WIDTH + 100, height: 50, color: '#555' // Bottom wall
        });
        this.enemyManager.obstacles.push({
            x: -50, y: 0, width: 50, height: CONFIG.WORLD_HEIGHT, color: '#555' // Left wall
        });
        this.enemyManager.obstacles.push({
            x: CONFIG.WORLD_WIDTH, y: 0, width: 50, height: CONFIG.WORLD_HEIGHT, color: '#555' // Right wall
        });
        
        // Add obstacles to grid
        for (const obstacle of this.enemyManager.obstacles) {
            this.grid.add(obstacle);
        }
        
        // Create some random obstacles throughout the world
        const numObstacles = 40; // More obstacles for a larger world
        
        for (let i = 0; i < numObstacles; i++) {
            const width = 30 + Math.floor(Math.random() * 70);
            const height = 30 + Math.floor(Math.random() * 70);
            
            // Find valid position (not on player)
            let x, y, validPosition = false;
            
            while (!validPosition) {
                x = 50 + Math.random() * (CONFIG.WORLD_WIDTH - width - 100);
                y = 50 + Math.random() * (CONFIG.WORLD_HEIGHT - height - 100);
                
                // Make sure obstacle is away from player
                const distToPlayer = Math.sqrt(
                    Math.pow(x + width/2 - this.player.x, 2) + 
                    Math.pow(y + height/2 - this.player.y, 2)
                );
                
                if (distToPlayer > 200) {
                    validPosition = true;
                }
            }
            
            const obstacle = {
                x: x,
                y: y,
                width: width,
                height: height,
                color: '#555'
            };
            
            this.enemyManager.obstacles.push(obstacle);
            this.grid.add(obstacle);
        }
    }
    
    // Game over
    gameOver() {
        this.gameRunning = false;
        
        // Show game over screen
        this.menus.showGameOver(this.score, this.currentWave);
        
        // Delete save
        this.saveSystem.deleteSave();
        
        // Play game over sound
        this.audio.play('gameOver');
        
        // Stop game loop
        this.gameLoop.stop();
    }
    
    // Level up
    levelUp() {
        this.playerStats.level++;
        this.playerStats.xp -= this.playerStats.xpToNextLevel;
        this.playerStats.xpToNextLevel = Math.floor(this.playerStats.xpToNextLevel * 1.5);
        this.playerStats.availableUpgradePoints++;
        
        // Apply base upgrades
        this.applyPlayerUpgrades();
        
        // Show level up screen
        this.menus.showLevelUpScreen(this.playerStats.level, this.applyUpgrade.bind(this));
        
        // Pause game
        this.gamePaused = true;
    }
    
    // Apply upgrade
    applyUpgrade(upgradeType) {
        this.playerStats.upgrades[upgradeType]++;
        this.playerStats.availableUpgradePoints--;
        
        // Apply upgrades to player
        this.applyPlayerUpgrades();
        
        // Update HUD
        this.hud.update(this);
        
        // Resume game
        this.gamePaused = false;
    }
    
    // Apply player upgrades
    applyPlayerUpgrades() {
        this.player.maxHealth = 100 + (this.playerStats.upgrades.health * 20);
        this.player.baseSpeed = 4 + (this.playerStats.upgrades.speed * 0.4);
        this.player.damageMultiplier = 1 + (this.playerStats.upgrades.damage * 0.15);
        this.player.fireRateMultiplier = 1 + (this.playerStats.upgrades.fireRate * 0.1);
    }
    
    // Update function
    update(deltaTime) {
        if (!this.gameRunning || this.gamePaused) return;
        
        // Update player
        this.player.update(deltaTime, this.input, this.grid, this.enemyManager.obstacles);
        
        // Update camera
        this.camera.update(this.player);
        
        // Update world mouse position
        this.input.updateWorldMousePosition(this.camera);
        
        // Update bullets
        this.bulletManager.update(deltaTime);
        
        // Update enemies
        this.enemyManager.update(deltaTime, this.player);
        
        // Update powerups
        this.powerupManager.update(deltaTime, this.player, this);
        
        // Update particles
        this.particleManager.update(deltaTime);
        
        // Update coordinates display
        this.hud.update(this);
    }
    
    // Render function
    render() {
        this.renderer.clear();
        this.renderer.renderGrid(this.camera);
        this.renderer.renderObstacles(this.enemyManager.obstacles, this.camera);
        this.renderer.renderPowerups(this.powerupManager.powerups, this.camera);
        this.renderer.renderParticles(this.particleManager.particles, this.camera);
        this.renderer.renderBullets(this.bulletManager.bullets, this.camera);
        this.renderer.renderEnemies(this.enemyManager.enemies, this.camera);
        this.renderer.renderPlayer(this.player, this.camera, this.input.worldMouseX, this.input.worldMouseY);
        this.minimap.render(this);
    }
    
    // Bind events
    bindEvents() {
        document.getElementById('start-button').addEventListener('click', () => this.initGame());
        document.getElementById('restart-button').addEventListener('click', () => this.initGame());
        document.getElementById('continue-button').addEventListener('click', () => this.continueGame());
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new BoxheadGame();
    game.init();
    
    // Make the game instance globally accessible for debugging
    window.gameInstance = game;
});