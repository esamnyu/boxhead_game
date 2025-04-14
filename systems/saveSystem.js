// saveSystem.js - Game state persistence

export class SaveSystem {
    constructor() {
        this.saveKey = 'boxhead_game_save';
    }
    
    // Check if a save exists
    hasSave() {
        return localStorage.getItem(this.saveKey) !== null;
    }
    
    // Save game state
    save(game) {
        // Create save data object with all necessary game state
        const saveData = {
            // Game state
            score: game.score,
            currentWave: game.currentWave,
            
            // Player state
            player: {
                x: game.player.x,
                y: game.player.y,
                health: game.player.health,
                maxHealth: game.player.maxHealth,
                weapon: game.player.weapon,
                ammo: game.player.ammo,
                speedBoost: game.player.speedBoost,
                speedBoostDuration: game.player.speedBoostDuration,
                damageMultiplier: game.player.damageMultiplier,
                fireRateMultiplier: game.player.fireRateMultiplier
            },
            
            // Player stats
            playerStats: {
                level: game.playerStats.level,
                xp: game.playerStats.xp,
                xpToNextLevel: game.playerStats.xpToNextLevel,
                availableUpgradePoints: game.playerStats.availableUpgradePoints,
                upgrades: { ...game.playerStats.upgrades }
            },
            
            // Timestamp
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            console.log('Game saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }
    
    // Load game state
    load(game) {
        try {
            const saveDataString = localStorage.getItem(this.saveKey);
            
            if (!saveDataString) {
                console.warn('No save data found');
                return false;
            }
            
            const saveData = JSON.parse(saveDataString);
            
            // Validate save data format
            if (!this.validateSaveData(saveData)) {
                console.error('Invalid save data format');
                return false;
            }
            
            // Load game state
            game.score = saveData.score;
            game.currentWave = saveData.currentWave;
            
            // Load player state
            game.player.x = saveData.player.x;
            game.player.y = saveData.player.y;
            game.player.health = saveData.player.health;
            game.player.maxHealth = saveData.player.maxHealth;
            game.player.weapon = saveData.player.weapon;
            game.player.ammo = saveData.player.ammo;
            game.player.speedBoost = saveData.player.speedBoost;
            game.player.speedBoostDuration = saveData.player.speedBoostDuration;
            game.player.damageMultiplier = saveData.player.damageMultiplier;
            game.player.fireRateMultiplier = saveData.player.fireRateMultiplier;
            
            // Load player stats
            game.playerStats.level = saveData.playerStats.level;
            game.playerStats.xp = saveData.playerStats.xp;
            game.playerStats.xpToNextLevel = saveData.playerStats.xpToNextLevel;
            game.playerStats.availableUpgradePoints = saveData.playerStats.availableUpgradePoints;
            
            // Load upgrades
            for (const upgrade in saveData.playerStats.upgrades) {
                game.playerStats.upgrades[upgrade] = saveData.playerStats.upgrades[upgrade];
            }
            
            // Apply upgrades to player
            game.applyPlayerUpgrades();
            
            console.log('Game loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            return false;
        }
    }
    
    // Delete save
    deleteSave() {
        try {
            localStorage.removeItem(this.saveKey);
            console.log('Save deleted successfully');
            return true;
        } catch (error) {
            console.error('Failed to delete save:', error);
            return false;
        }
    }
    
    // Validate save data format
    validateSaveData(saveData) {
        // Check if save data has required properties
        if (!saveData.score || !saveData.currentWave || 
            !saveData.player || !saveData.playerStats) {
            return false;
        }
        
        // Check player data
        const player = saveData.player;
        if (player.x === undefined || player.y === undefined || 
            player.health === undefined || player.maxHealth === undefined || 
            player.weapon === undefined) {
            return false;
        }
        
        // Check player stats
        const stats = saveData.playerStats;
        if (stats.level === undefined || stats.xp === undefined || 
            stats.xpToNextLevel === undefined || !stats.upgrades) {
            return false;
        }
        
        return true;
    }
    
    // Export save as file
    exportSave() {
        if (!this.hasSave()) {
            console.warn('No save data to export');
            return false;
        }
        
        try {
            const saveData = localStorage.getItem(this.saveKey);
            const blob = new Blob([saveData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'boxhead_save.json';
            
            // Trigger download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Failed to export save:', error);
            return false;
        }
    }
    
    // Import save from file
    importSave(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const saveData = JSON.parse(event.target.result);
                    
                    // Validate save data
                    if (!this.validateSaveData(saveData)) {
                        reject(new Error('Invalid save file format'));
                        return;
                    }
                    
                    // Store save data
                    localStorage.setItem(this.saveKey, JSON.stringify(saveData));
                    console.log('Save imported successfully');
                    resolve(true);
                } catch (error) {
                    console.error('Failed to parse save file:', error);
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                console.error('Failed to read save file:', error);
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }
}