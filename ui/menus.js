// menus.js - Menu and UI overlay management

export class MenuManager {
    constructor() {
        this.mainMenu = null;
        this.gameOverMenu = null;
        this.levelUpMenu = null;
        this.waveNotification = null;
        this.bossWarning = null;
        this.continueButton = null;
    }
    
    // Initialize menu elements
    init() {
        // Get menu element references
        this.mainMenu = document.getElementById('main-menu');
        this.gameOverMenu = document.getElementById('game-over-menu');
        this.levelUpMenu = document.getElementById('level-up-menu');
        this.waveNotification = document.getElementById('wave-notification');
        this.bossWarning = document.getElementById('boss-warning');
        this.continueButton = document.getElementById('continue-button');
        
        // Add click handlers to upgrade options
        const upgradeOptions = document.querySelectorAll('.upgrade-option');
        
        if (!this.mainMenu || !this.gameOverMenu || !this.levelUpMenu || 
            !this.waveNotification || !this.bossWarning) {
            console.error('Menu elements not found');
            return false;
        }
        
        // Show main menu
        this.showMainMenu();
        
        return true;
    }
    
    // Show main menu
    showMainMenu() {
        this.hideMenus();
        this.mainMenu.style.display = 'flex';
    }
    
    // Show continue button if save exists
    showContinueButton() {
        if (this.continueButton) {
            this.continueButton.style.display = 'inline-block';
        }
    }
    
    // Show game over screen
    showGameOver(score, wave) {
        this.hideMenus();
        
        // Update score and wave display
        document.getElementById('final-score').textContent = score;
        document.getElementById('final-wave').textContent = wave;
        
        // Show game over menu
        this.gameOverMenu.style.display = 'flex';
    }
    
    // Show level up screen
    showLevelUpScreen(level, applyUpgradeCallback) {
        this.hideMenus();
        
        // Update level display
        const levelUpTitle = this.levelUpMenu.querySelector('h2');
        levelUpTitle.textContent = `Level Up! (Level ${level})`;
        
        // Clear any existing event listeners
        const upgradeOptions = this.levelUpMenu.querySelectorAll('.upgrade-option');
        
        upgradeOptions.forEach(option => {
            // Clone to remove event listeners
            const newOption = option.cloneNode(true);
            option.parentNode.replaceChild(newOption, option);
            
            // Add new event listener
            newOption.addEventListener('click', () => {
                const upgradeType = newOption.getAttribute('data-upgrade');
                applyUpgradeCallback(upgradeType);
                this.hideMenus();
            });
        });
        
        // Show level up menu
        this.levelUpMenu.style.display = 'flex';
    }
    
    // Show wave announcement
    showWaveAnnouncement(waveNumber) {
        // Update wave number display
        document.getElementById('wave-number').textContent = waveNumber;
        
        // Show notification
        this.waveNotification.style.display = 'block';
        this.waveNotification.classList.add('visible');
        
        // Hide after 3 seconds
        setTimeout(() => {
            this.waveNotification.classList.remove('visible');
            setTimeout(() => {
                this.waveNotification.style.display = 'none';
            }, 500);
        }, 3000);
    }
    
    // Show wave complete notification
    showWaveComplete(waveNumber) {
        // Create a custom notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.display = 'block';
        notification.innerHTML = `
            <h2>Wave ${waveNumber} Complete!</h2>
            <p>Get ready for the next wave...</p>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
    
    // Show boss warning
    showBossWarning() {
        // Show notification
        this.bossWarning.style.display = 'block';
        this.bossWarning.classList.add('visible');
        
        // Add pulsing effect
        let pulseCount = 0;
        const pulseInterval = setInterval(() => {
            this.bossWarning.style.transform = pulseCount % 2 === 0 ? 
                'translate(-50%, -50%) scale(1.1)' : 
                'translate(-50%, -50%) scale(1.0)';
            
            pulseCount++;
            
            if (pulseCount >= 6) {
                clearInterval(pulseInterval);
                
                // Hide after pulsing finishes
                setTimeout(() => {
                    this.bossWarning.classList.remove('visible');
                    setTimeout(() => {
                        this.bossWarning.style.display = 'none';
                        this.bossWarning.style.transform = 'translate(-50%, -50%) scale(1.0)';
                    }, 500);
                }, 1000);
            }
        }, 300);
    }
    
    // Hide all menus
    hideMenus() {
        if (this.mainMenu) this.mainMenu.style.display = 'none';
        if (this.gameOverMenu) this.gameOverMenu.style.display = 'none';
        if (this.levelUpMenu) this.levelUpMenu.style.display = 'none';
        if (this.waveNotification) {
            this.waveNotification.classList.remove('visible');
            this.waveNotification.style.display = 'none';
        }
        if (this.bossWarning) {
            this.bossWarning.classList.remove('visible');
            this.bossWarning.style.display = 'none';
        }
    }
    
    // Show a custom popup
    showPopup(title, message, buttons = []) {
        this.hideMenus();
        
        // Create popup element
        const popup = document.createElement('div');
        popup.className = 'menu-container';
        
        let buttonsHTML = '';
        for (const button of buttons) {
            buttonsHTML += `<button class="popup-button" data-action="${button.action}">${button.text}</button>`;
        }
        
        popup.innerHTML = `
            <div class="menu">
                <h2>${title}</h2>
                <p>${message}</p>
                <div class="popup-buttons">
                    ${buttonsHTML}
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(popup);
        
        // Add button event listeners
        const buttonElements = popup.querySelectorAll('.popup-button');
        buttonElements.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                
                // Call callback if provided
                for (const buttonConfig of buttons) {
                    if (buttonConfig.action === action && buttonConfig.callback) {
                        buttonConfig.callback();
                        break;
                    }
                }
                
                // Remove popup
                document.body.removeChild(popup);
            });
        });
        
        return popup;
    }
    
    // Show confirm dialog
    showConfirm(message, yesCallback, noCallback = null) {
        return this.showPopup('Confirm', message, [
            { text: 'Yes', action: 'yes', callback: yesCallback },
            { text: 'No', action: 'no', callback: noCallback }
        ]);
    }
}