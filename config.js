// config.js - Game configuration constants

export const CONFIG = {
    // World settings
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 2400,
    ENEMY_SPAWN_DISTANCE: 800,
    POWERUP_DROP_CHANCE: 0.2,
    
    // Performance settings
    FPS_CAP: 60,
    GRID_CELL_SIZE: 100,
    MAX_PARTICLES: 200,        // Limit total particles
    PARTICLE_BATCH_SIZE: 10,   // Max particles created at once
    CULL_DISTANCE: 1200,       // Don't update entities beyond this distance
    
    // Weapon definitions
    WEAPONS: {
        Pistol: {
            damage: 25,
            fireRate: 300,
            bulletSpeed: 8,
            bulletSize: 5,
            bulletColor: 'orange',
            ammo: Infinity,
            sound: 'pistol'
        },
        Shotgun: {
            damage: 15,
            fireRate: 800,
            bulletSpeed: 7,
            bulletSize: 4,
            bulletColor: 'red',
            spread: 0.3,
            bullets: 5,
            ammo: 30,
            knockback: 2,
            sound: 'shotgun'
        },
        MachineGun: {
            damage: 10,
            fireRate: 100,
            bulletSpeed: 10,
            bulletSize: 3,
            bulletColor: 'yellow',
            ammo: 100,
            sound: 'machinegun'
        },
        GrenadeLauncher: {
            damage: 50,
            fireRate: 1500,
            bulletSpeed: 5,
            bulletSize: 8,
            bulletColor: 'green',
            ammo: 10,
            explosion: {
                radius: 80,
                damage: 40
            },
            sound: 'grenade'
        }
    },
    
    // Enemy types
    ENEMY_TYPES: {
        normal: {
            width: 25,
            height: 25,
            health: 50,
            speed: 1.5,
            damage: 0.5,
            color: 'green',
            points: 10
        },
        fast: {
            width: 20,
            height: 20,
            health: 30,
            speed: 2.5,
            damage: 0.3,
            color: 'yellow',
            points: 15
        },
        tank: {
            width: 35,
            height: 35,
            health: 100,
            speed: 0.8,
            damage: 1,
            color: 'purple',
            points: 25
        },
        boss: {
            width: 60,
            height: 60,
            health: 500,
            speed: 1.0,
            damage: 2,
            color: 'red',
            points: 100
        }
    },
    
    // Powerup types
    POWERUP_TYPES: [
        {
            type: 'health',
            color: '#e74c3c',
            effect: function(player, game) {
                player.health = Math.min(player.maxHealth, player.health + 25);
                game.audio.play('powerup');
            }
        },
        {
            type: 'weapon',
            color: '#9b59b6',
            effect: function(player, game) {
                const weapons = ['Shotgun', 'MachineGun', 'GrenadeLauncher'];
                player.weapon = weapons[Math.floor(Math.random() * weapons.length)];
                player.ammo = CONFIG.WEAPONS[player.weapon].ammo;
                game.audio.play('powerup');
            }
        },
        {
            type: 'speed',
            color: '#3498db',
            effect: function(player, game) {
                player.speedBoost = 2;
                player.speedBoostDuration = 600; // 10 seconds at 60fps
                game.audio.play('powerup');
            }
        },
        {
            type: 'ammo',
            color: '#f1c40f',
            effect: function(player, game) {
                if (player.weapon !== 'Pistol') {
                    player.ammo = Math.min(
                        CONFIG.WEAPONS[player.weapon].ammo * 2,
                        player.ammo + Math.floor(CONFIG.WEAPONS[player.weapon].ammo * 0.5)
                    );
                }
                game.audio.play('powerup');
            }
        }
    ]
};