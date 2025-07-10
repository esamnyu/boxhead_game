// batchRenderer.js - Batched rendering system for performance optimization

export class BatchRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.batches = new Map();
    }
    
    // Reset batches for new frame
    reset() {
        this.batches.clear();
    }
    
    // Add a rectangle to batch
    addRect(color, x, y, width, height, globalAlpha = 1) {
        const key = `rect_${color}_${globalAlpha}`;
        
        if (!this.batches.has(key)) {
            this.batches.set(key, {
                type: 'rect',
                color,
                globalAlpha,
                items: []
            });
        }
        
        this.batches.get(key).items.push({ x, y, width, height });
    }
    
    // Add a circle to batch
    addCircle(color, x, y, radius, globalAlpha = 1) {
        const key = `circle_${color}_${globalAlpha}`;
        
        if (!this.batches.has(key)) {
            this.batches.set(key, {
                type: 'circle',
                color,
                globalAlpha,
                items: []
            });
        }
        
        this.batches.get(key).items.push({ x, y, radius });
    }
    
    // Add a stroke rectangle to batch
    addStrokeRect(color, x, y, width, height, lineWidth = 1, globalAlpha = 1) {
        const key = `strokeRect_${color}_${lineWidth}_${globalAlpha}`;
        
        if (!this.batches.has(key)) {
            this.batches.set(key, {
                type: 'strokeRect',
                color,
                lineWidth,
                globalAlpha,
                items: []
            });
        }
        
        this.batches.get(key).items.push({ x, y, width, height });
    }
    
    // Render all batches
    flush() {
        const ctx = this.ctx;
        
        // Save context state
        ctx.save();
        
        for (const [key, batch] of this.batches) {
            // Set common properties for batch
            if (batch.globalAlpha !== 1) {
                ctx.globalAlpha = batch.globalAlpha;
            }
            
            switch (batch.type) {
                case 'rect':
                    ctx.fillStyle = batch.color;
                    for (const item of batch.items) {
                        ctx.fillRect(item.x, item.y, item.width, item.height);
                    }
                    break;
                    
                case 'circle':
                    ctx.fillStyle = batch.color;
                    ctx.beginPath();
                    for (const item of batch.items) {
                        ctx.moveTo(item.x + item.radius, item.y);
                        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                    }
                    ctx.fill();
                    break;
                    
                case 'strokeRect':
                    ctx.strokeStyle = batch.color;
                    ctx.lineWidth = batch.lineWidth;
                    ctx.beginPath();
                    for (const item of batch.items) {
                        ctx.rect(item.x, item.y, item.width, item.height);
                    }
                    ctx.stroke();
                    break;
            }
            
            // Reset alpha if changed
            if (batch.globalAlpha !== 1) {
                ctx.globalAlpha = 1;
            }
        }
        
        // Restore context state
        ctx.restore();
        
        // Clear batches after rendering
        this.reset();
    }
    
    // Get batch statistics
    getStats() {
        let totalItems = 0;
        for (const batch of this.batches.values()) {
            totalItems += batch.items.length;
        }
        
        return {
            batchCount: this.batches.size,
            totalItems,
            averageItemsPerBatch: this.batches.size > 0 ? totalItems / this.batches.size : 0
        };
    }
}