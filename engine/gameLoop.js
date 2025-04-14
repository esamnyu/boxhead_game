// gameLoop.js - Game timing and update/render cycle

import { CONFIG } from '../config.js';

export class GameLoop {
    constructor(updateFn, renderFn) {
        // Store update and render callbacks
        this.update = updateFn;
        this.render = renderFn;
        
        // Animation frame request ID
        this.requestId = null;
        
        // Time tracking
        this.lastFrameTime = 0;
        this.accumulatedTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Performance metrics
        this.fps = 0;
        this.frameTime = 0;
        this.isRunning = false;
        
        // Calculate timestep from FPS cap
        this.timeStep = 1000 / CONFIG.FPS_CAP;
        
        // Bind loop method to keep the correct this context
        this.loop = this.loop.bind(this);
    }
    
    // Start the game loop
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = this.lastFrameTime;
        this.frameCount = 0;
        this.requestId = requestAnimationFrame(this.loop);
    }
    
    // Stop the game loop
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }
    
    // Main loop function
    loop(currentTime) {
        // Calculate time since last frame
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Update FPS counter once per second
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.lastFpsUpdate = currentTime;
            this.frameCount = 0;
        }
        
        // Store frame time for performance monitoring
        this.frameTime = deltaTime;
        
        // Prevent spiral of death if browser tab is inactive
        const maxFrameTime = 250; 
        const clampedDelta = Math.min(deltaTime, maxFrameTime);
        
        // Accumulate time for fixed step updates
        this.accumulatedTime += clampedDelta;
        
        // Perform fixed step updates
        while (this.accumulatedTime >= this.timeStep) {
            this.update(this.timeStep / 1000); // Convert to seconds
            this.accumulatedTime -= this.timeStep;
        }
        
        // Render the current state
        this.render();
        
        // Schedule the next frame
        if (this.isRunning) {
            this.requestId = requestAnimationFrame(this.loop);
        }
    }
    
    // Toggle pause state
    togglePause() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    // Get current performance metrics
    getPerformanceMetrics() {
        return {
            fps: this.fps,
            frameTime: this.frameTime.toFixed(2),
            isRunning: this.isRunning
        };
    }
}