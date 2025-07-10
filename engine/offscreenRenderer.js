// offscreenRenderer.js - Offscreen canvas rendering for static elements

export class OffscreenRenderer {
    constructor() {
        this.canvases = new Map();
    }
    
    // Create or get an offscreen canvas
    getCanvas(key, width, height) {
        if (!this.canvases.has(key)) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            this.canvases.set(key, {
                canvas,
                ctx: canvas.getContext('2d'),
                dirty: true
            });
        }
        
        const canvasData = this.canvases.get(key);
        
        // Resize if dimensions changed
        if (canvasData.canvas.width !== width || canvasData.canvas.height !== height) {
            canvasData.canvas.width = width;
            canvasData.canvas.height = height;
            canvasData.dirty = true;
        }
        
        return canvasData;
    }
    
    // Mark a canvas as needing redraw
    markDirty(key) {
        const canvasData = this.canvases.get(key);
        if (canvasData) {
            canvasData.dirty = true;
        }
    }
    
    // Check if canvas needs redraw
    isDirty(key) {
        const canvasData = this.canvases.get(key);
        return canvasData ? canvasData.dirty : true;
    }
    
    // Mark canvas as clean after drawing
    markClean(key) {
        const canvasData = this.canvases.get(key);
        if (canvasData) {
            canvasData.dirty = false;
        }
    }
    
    // Draw offscreen canvas to main canvas
    drawToCanvas(key, targetCtx, x = 0, y = 0) {
        const canvasData = this.canvases.get(key);
        if (canvasData && canvasData.canvas) {
            targetCtx.drawImage(canvasData.canvas, x, y);
        }
    }
    
    // Clear all canvases
    clear() {
        this.canvases.clear();
    }
    
    // Pre-render grid pattern
    renderGrid(cellSize, worldWidth, worldHeight, strokeStyle = 'rgba(255, 255, 255, 0.1)') {
        const key = 'grid';
        const canvasData = this.getCanvas(key, worldWidth, worldHeight);
        
        if (!canvasData.dirty) return canvasData.canvas;
        
        const ctx = canvasData.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, worldWidth, worldHeight);
        
        // Set styles
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        ctx.beginPath();
        for (let x = 0; x <= worldWidth; x += cellSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, worldHeight);
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= worldHeight; y += cellSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(worldWidth, y);
        }
        
        ctx.stroke();
        
        this.markClean(key);
        return canvasData.canvas;
    }
    
    // Pre-render obstacles
    renderObstacles(obstacles) {
        const key = 'obstacles';
        
        // Calculate bounds
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const obstacle of obstacles) {
            minX = Math.min(minX, obstacle.x);
            minY = Math.min(minY, obstacle.y);
            maxX = Math.max(maxX, obstacle.x + obstacle.width);
            maxY = Math.max(maxY, obstacle.y + obstacle.height);
        }
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        const canvasData = this.getCanvas(key, width, height);
        
        if (!canvasData.dirty) return { canvas: canvasData.canvas, offsetX: minX, offsetY: minY };
        
        const ctx = canvasData.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw obstacles
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        
        for (const obstacle of obstacles) {
            const x = obstacle.x - minX;
            const y = obstacle.y - minY;
            
            ctx.fillRect(x, y, obstacle.width, obstacle.height);
            ctx.strokeRect(x, y, obstacle.width, obstacle.height);
        }
        
        this.markClean(key);
        return { canvas: canvasData.canvas, offsetX: minX, offsetY: minY };
    }
}