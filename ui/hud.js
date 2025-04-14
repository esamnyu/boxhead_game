// hud.js - Heads-up display for player information

export class HUD {
    constructor() {
        this.container = null;
        this.elements = {};
        this.visible = true;
    }
    
    // Initialize HUD
    init() {
        this.container = document.getElementById('hud-container');
        
        if (!this.container) {
            console.error('HUD container not found');
            return false;
        }
        
        // Create HUD elements
        this.createHUDElements();
        
        return true;
    }
    
    // Create HUD elements
    createHUDElements() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create HUD structure
        const hudHTML = `
            <div style="padding: 20px; pointer-events: none;">
                <!-- Top row: health and weapon -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <!-- Health bar -->
                    <div style="background-color: rgba(0, 0, 0, 0.5); border-radius: 5px; padding: 5px; width: 200px;">
                        <div style="display: flex; align-items: center;">
                            <span style="color: white; margin-right: 5px;">HP</span>
                            <div style="flex-grow: 1; background-color: rgba(255, 255, 255, 0.2); height: 20px; border-radius: 3px; overflow: hidden;">
                                <div id="health-bar" style="width: 100%; height: 100%; background-color: #e74c3c; transition: width 0.3s;"></div>
                            </div>
                            <span id="health-text" style="color: white; margin-left: 5px;">100/100</span>
                        </div>
                    </div>
                    
                    <!-- Weapon info -->
                    <div style="background-color: rgba(0, 0, 0, 0.5); border-radius: 5px; padding: 5px; width: 200px; text-align: center;">
                        <span id="weapon-name" style="color: white; font-weight: bold;">Pistol</span>
                        <span id="ammo-count" style="color: white; margin-left: 10px;">∞</span>
                    </div>
                </div>
                
                <!-- Bottom row: score and wave -->
                <div style="display: flex; justify-content: space-between;">
                    <!-- Score -->
                    <div style="background-color: rgba(0, 0, 0, 0.5); border-radius: 5px; padding: 5px;">
                        <span style="color: white;">Score: </span>
                        <span id="score-text" style="color: white; font-weight: bold;">0</span>
                    </div>
                    
                    <!-- Wave -->
                    <div style="background-color: rgba(0, 0, 0, 0.5); border-radius: 5px; padding: 5px;">
                        <span style="color: white;">Wave: </span>
                        <span id="wave-text" style="color: white; font-weight: bold;">1</span>
                    </div>
                </div>
                
                <!-- XP bar -->
                <div style="background-color: rgba(0, 0, 0, 0.5); border-radius: 5px; padding: 5px; margin-top: 10px;">
                    <div style="display: flex; align-items: center;">
                        <span style="color: white; margin-right: 5px;">LVL</span>
                        <span id="level-text" style="color: white; margin-right: 5px;">1</span>
                        <div style="flex-grow: 1; background-color: rgba(255, 255, 255, 0.2); height: 10px; border-radius: 3px; overflow: hidden;">
                            <div id="xp-bar" style="width: 0%; height: 100%; background-color: #3498db; transition: width 0.3s;"></div>
                        </div>
                        <span id="xp-text" style="color: white; margin-left: 5px; font-size: 12px;">0/100</span>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = hudHTML;
        
        // Store references to elements for updates
        this.elements = {
            healthBar: document.getElementById('health-bar'),
            healthText: document.getElementById('health-text'),
            weaponName: document.getElementById('weapon-name'),
            ammoCount: document.getElementById('ammo-count'),
            scoreText: document.getElementById('score-text'),
            waveText: document.getElementById('wave-text'),
            levelText: document.getElementById('level-text'),
            xpBar: document.getElementById('xp-bar'),
            xpText: document.getElementById('xp-text')
        };
    }
    
    // Update HUD with current game state
    update(game) {
        if (!this.visible) return;
        
        // Update health
        const healthPercent = (game.player.health / game.player.maxHealth) * 100;
        this.elements.healthBar.style.width = `${healthPercent}%`;
        this.elements.healthText.textContent = `${Math.floor(game.player.health)}/${game.player.maxHealth}`;
        
        // Update health bar color based on health percentage
        if (healthPercent > 50) {
            this.elements.healthBar.style.backgroundColor = '#e74c3c';
        } else if (healthPercent > 25) {
            this.elements.healthBar.style.backgroundColor = '#f39c12';
        } else {
            this.elements.healthBar.style.backgroundColor = '#c0392b';
        }
        
        // Update weapon info
        this.elements.weaponName.textContent = game.player.weapon;
        
        // Update ammo count
        if (game.player.ammo === Infinity) {
            this.elements.ammoCount.textContent = '∞';
        } else {
            this.elements.ammoCount.textContent = game.player.ammo;
            
            // Highlight low ammo
            if (game.player.ammo < 5) {
                this.elements.ammoCount.style.color = '#e74c3c';
            } else {
                this.elements.ammoCount.style.color = 'white';
            }
        }
        
        // Update score
        this.elements.scoreText.textContent = game.score;
        
        // Update wave
        this.elements.waveText.textContent = game.currentWave;
        
        // Update level and XP
        this.elements.levelText.textContent = game.playerStats.level;
        
        const xpPercent = (game.playerStats.xp / game.playerStats.xpToNextLevel) * 100;
        this.elements.xpBar.style.width = `${xpPercent}%`;
        this.elements.xpText.textContent = `${game.playerStats.xp}/${game.playerStats.xpToNextLevel}`;
    }
    
    // Show HUD
    show() {
        this.visible = true;
        this.container.style.display = 'block';
    }
    
    // Hide HUD
    hide() {
        this.visible = false;
        this.container.style.display = 'none';
    }
    
    // Display notification message
    showNotification(message, duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.style.position = 'absolute';
        notification.style.top = '20%';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.textAlign = 'center';
        notification.style.zIndex = '1000';
        notification.style.transition = 'opacity 0.3s';
        notification.style.pointerEvents = 'none';
        
        notification.textContent = message;
        
        // Add to container
        this.container.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
}