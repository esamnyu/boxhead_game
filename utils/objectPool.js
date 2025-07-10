// objectPool.js - Generic object pooling system for performance optimization

export class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.activeCount = 0;
        
        // Pre-allocate initial objects
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    // Get an object from the pool
    get() {
        let obj;
        
        if (this.activeCount < this.pool.length) {
            // Reuse existing object
            obj = this.pool[this.activeCount];
        } else {
            // Need to expand pool
            obj = this.createFn();
            this.pool.push(obj);
        }
        
        this.activeCount++;
        return obj;
    }
    
    // Return all objects to the pool
    releaseAll() {
        // Reset all active objects
        for (let i = 0; i < this.activeCount; i++) {
            this.resetFn(this.pool[i]);
        }
        
        this.activeCount = 0;
    }
    
    // Get current pool statistics
    getStats() {
        return {
            totalSize: this.pool.length,
            activeCount: this.activeCount,
            freeCount: this.pool.length - this.activeCount
        };
    }
}

// Rectangle pool specifically for collision detection
export class RectPool {
    constructor(initialSize = 100) {
        this.pool = new ObjectPool(
            () => ({ x: 0, y: 0, width: 0, height: 0 }),
            (rect) => {
                rect.x = 0;
                rect.y = 0;
                rect.width = 0;
                rect.height = 0;
            },
            initialSize
        );
    }
    
    // Get a rectangle configured for an entity
    getForEntity(entity) {
        const rect = this.pool.get();
        rect.x = entity.x - entity.width / 2;
        rect.y = entity.y - entity.height / 2;
        rect.width = entity.width;
        rect.height = entity.height;
        return rect;
    }
    
    // Get a rectangle with specific bounds
    getBounds(x, y, width, height) {
        const rect = this.pool.get();
        rect.x = x;
        rect.y = y;
        rect.width = width;
        rect.height = height;
        return rect;
    }
    
    // Release all rectangles back to pool
    releaseAll() {
        this.pool.releaseAll();
    }
    
    // Get pool statistics
    getStats() {
        return this.pool.getStats();
    }
}

// Global rectangle pool instance
export const rectPool = new RectPool();