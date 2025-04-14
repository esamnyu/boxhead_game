// audio.js - Sound effect and music system

export class AudioSystem {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.musicVolume = 0.3;
        this.soundVolume = 0.5;
        this.muted = false;
        
        // Sound sources
        this.soundSources = {
            // Weapons
            pistol: 'sounds/pistol.mp3',
            shotgun: 'sounds/shotgun.mp3',
            machinegun: 'sounds/machinegun.mp3',
            grenade: 'sounds/grenade.mp3',
            explosion: 'sounds/explosion.mp3',
            
            // Player
            playerDamage: 'sounds/player_damage.mp3',
            playerDeath: 'sounds/player_death.mp3',
            
            // Enemies
            enemyDeath: 'sounds/enemy_death.mp3',
            bossSpawn: 'sounds/boss_spawn.mp3',
            bossDeath: 'sounds/boss_death.mp3',
            
            // Powerups
            powerup: 'sounds/powerup.mp3',
            
            // UI
            menuSelect: 'sounds/menu_select.mp3',
            levelUp: 'sounds/level_up.mp3',
            start: 'sounds/game_start.mp3',
            continue: 'sounds/game_continue.mp3',
            gameOver: 'sounds/game_over.mp3'
        };
        
        // Audio context
        this.audioContext = null;
        this.audioBuffers = {};
        this.activeSounds = [];
    }
    
    // Initialize audio system
    init() {
        try {
            // Create audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Load all sounds
            this.loadSounds();
            
            return true;
        } catch (e) {
            console.error('Web Audio API not supported in this browser', e);
            return false;
        }
    }
    
    // Load all sound files
    async loadSounds() {
        const loadPromises = [];
        
        for (const [name, url] of Object.entries(this.soundSources)) {
            loadPromises.push(this.loadSound(name, url));
        }
        
        try {
            await Promise.all(loadPromises);
            console.log('All sounds loaded successfully');
        } catch (error) {
            console.error('Error loading sounds:', error);
        }
    }
    
    // Load a single sound file
    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.audioBuffers[name] = audioBuffer;
        } catch (error) {
            console.error(`Error loading sound ${name} from ${url}:`, error);
            
            // Create a silent buffer as fallback
            const fallbackBuffer = this.audioContext.createBuffer(
                2, this.audioContext.sampleRate * 0.5, this.audioContext.sampleRate
            );
            this.audioBuffers[name] = fallbackBuffer;
        }
    }
    
    // Play a sound
    play(name, options = {}) {
        if (this.muted) return null;
        
        const buffer = this.audioBuffers[name];
        if (!buffer) {
            console.warn(`Sound "${name}" not found`);
            return null;
        }
        
        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Create sound source
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        
        // Set volume (with option to override default)
        const volume = options.volume !== undefined ? options.volume : this.soundVolume;
        gainNode.gain.value = volume;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Track active sound
        const soundInfo = {
            source,
            gainNode,
            startTime: this.audioContext.currentTime,
            name
        };
        
        this.activeSounds.push(soundInfo);
        
        // Start playback
        source.start(0);
        
        // Set up cleanup when sound ends
        source.onended = () => {
            const index = this.activeSounds.indexOf(soundInfo);
            if (index !== -1) {
                this.activeSounds.splice(index, 1);
            }
        };
        
        // Return sound info for further control
        return soundInfo;
    }
    
    // Stop a specific sound
    stop(soundInfo) {
        if (!soundInfo) return;
        
        try {
            soundInfo.source.stop();
        } catch (e) {
            // Ignore errors from already stopped sounds
        }
        
        const index = this.activeSounds.indexOf(soundInfo);
        if (index !== -1) {
            this.activeSounds.splice(index, 1);
        }
    }
    
    // Stop all sounds
    stopAll() {
        for (const sound of this.activeSounds) {
            try {
                sound.source.stop();
            } catch (e) {
                // Ignore errors from already stopped sounds
            }
        }
        
        this.activeSounds = [];
    }
    
    // Play music
    playMusic(url) {
        // Stop any currently playing music
        if (this.music) {
            this.music.pause();
            this.music = null;
        }
        
        // Create audio element for music
        this.music = new Audio(url);
        this.music.loop = true;
        this.music.volume = this.muted ? 0 : this.musicVolume;
        
        // Play music
        this.music.play().catch(error => {
            console.warn('Music autoplay failed:', error);
            
            // Add a UI indication to enable audio
            const audioPrompt = document.createElement('div');
            audioPrompt.className = 'audio-prompt';
            audioPrompt.innerText = 'Click to enable audio';
            audioPrompt.style.position = 'absolute';
            audioPrompt.style.top = '10px';
            audioPrompt.style.right = '10px';
            audioPrompt.style.padding = '10px';
            audioPrompt.style.background = 'rgba(0, 0, 0, 0.7)';
            audioPrompt.style.color = 'white';
            audioPrompt.style.borderRadius = '5px';
            audioPrompt.style.cursor = 'pointer';
            audioPrompt.style.zIndex = '1000';
            
            document.body.appendChild(audioPrompt);
            
            // Enable audio on click
            audioPrompt.addEventListener('click', () => {
                this.music.play();
                this.audioContext.resume();
                document.body.removeChild(audioPrompt);
            });
        });
    }
    
    // Set master volume
    setVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        
        // Update volume of all active sounds
        for (const sound of this.activeSounds) {
            sound.gainNode.gain.value = this.soundVolume;
        }
    }
    
    // Set music volume
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        if (this.music && !this.muted) {
            this.music.volume = this.musicVolume;
        }
    }
    
    // Toggle mute
    toggleMute() {
        this.muted = !this.muted;
        
        if (this.muted) {
            // Mute all active sounds
            for (const sound of this.activeSounds) {
                sound.gainNode.gain.value = 0;
            }
            
            // Mute music
            if (this.music) {
                this.music.volume = 0;
            }
        } else {
            // Unmute all active sounds
            for (const sound of this.activeSounds) {
                sound.gainNode.gain.value = this.soundVolume;
            }
            
            // Unmute music
            if (this.music) {
                this.music.volume = this.musicVolume;
            }
        }
        
        return this.muted;
    }
    
    // Clean up resources
    destroy() {
        this.stopAll();
        
        if (this.music) {
            this.music.pause();
            this.music = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}