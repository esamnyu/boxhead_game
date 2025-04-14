// particle.js - Particle effects management

import { CONFIG } from '../config.js';

export class ParticleManager {
    constructor() {
        this.particles = [];
        this.particlePool = []; // Object pool for particle reuse
    }
    
    // Clear all particles
    clear() {
        // Return all particles to pool
        for (const particle of this.particles) {
            this.returnParticleToPool(particle);
        }
        this.particles = [];
    }
    
    // Get particle from pool or create new one
    getParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        
        return {
            x: 0,
            y: 0,
            color: '',
            size: 0,
            lifetime: 0,
            maxLifetime: 0,
            speedX: 0,
            speedY: 0,
            active: true
        };
    }
    
    // Return particle to pool
    returnParticleToPool(particle) {
        // Reset particle properties
        particle.active = false;
        
        // Add to pool for reuse
        if (this.particlePool.length < 200) { // Limit pool size
            this.particlePool.push(particle);
        }
    }
    
    // Create a particle
    createParticle(x, y, color, size, lifetime, speedX, speedY) {
        // Limit total particles to prevent performance issues
        if (this.particles.length >= CONFIG.MAX_PARTICLES) {
            // Remove oldest particle
            const oldestParticle = this.particles.shift();
            this.returnParticleToPool(oldestParticle);
        }
        
        const particle = this.getParticle();
        
        particle.x = x;
        particle.y = y;
        particle.color = color;
        particle.size = size;
        particle.lifetime = lifetime;
        particle.maxLifetime = lifetime;
        particle.speedX = speedX;
        particle.speedY = speedY;
        particle.active = true;
        
        this.particles.push(particle);
    }
    
    // Create multiple particles with a limit
    createParticleBatch(x, y, color, size, lifetime, speedRange, count) {
        // Limit batch size
        const batchSize = Math.min(count, CONFIG.PARTICLE_BATCH_SIZE);
        
        for (let i = 0; i < batchSize; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
            
            this.createParticle(
                x, y,
                color,
                size[0] + Math.random() * (size[1] - size[0]),
                lifetime[0] + Math.random() * (lifetime[1] - lifetime[0]),
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
        }
    }
    
    // Create blood splatter effect
    createBloodSplatter(x, y) {
        this.createParticleBatch(
            x, y,
            'darkred',
            [2, 5], // Size range
            [15, 30], // Lifetime range
            [0.5, 2.5], // Speed range
            10 // Count
        );
    }
    
    // Update all particles
    update(deltaTime) {
        // Using a reverse loop for efficient removal
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Apply drag
            particle.speedX *= 0.96;
            particle.speedY *= 0.96;
            
            // Update lifetime
            particle.lifetime--;
            
            // Remove dead particles
            if (particle.lifetime <= 0) {
                this.returnParticleToPool(particle);
                this.particles.splice(i, 1);
            }
        }
    }
    
    // Optimization: Only get particles visible in camera view
    getVisibleParticles(camera) {
        return this.particles.filter(particle => {
            return (
                particle.x >= camera.x - particle.size &&
                particle.x <= camera.x + camera.width + particle.size &&
                particle.y >= camera.y - particle.size &&
                particle.y <= camera.y + camera.height + particle.size
            );
        });
    }
    
    // Debug: Get total particles count including pool
    getTotalParticlesCount() {
        return {
            active: this.particles.length,
            pool: this.particlePool.length,
            total: this.particles.length + this.particlePool.length
        };
    }
}