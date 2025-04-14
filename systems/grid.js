// grid.js - Spatial partitioning system for efficient collision detection

export class Grid {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.cells = {};
    }
    
    // Reset grid
    reset() {
        this.cells = {};
    }
    
    // Add object to grid
    add(obj) {
        // Skip if object has no position or size
        if (obj.x === undefined || obj.y === undefined || 
            obj.width === undefined || obj.height === undefined) {
            console.warn('Attempted to add invalid object to grid:', obj);
            return;
        }
        
        // Calculate cell coordinates based on object center
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        
        const cellX = Math.floor(centerX / this.cellSize);
        const cellY = Math.floor(centerY / this.cellSize);
        const cellKey = `${cellX},${cellY}`;
        
        if (!this.cells[cellKey]) {
            this.cells[cellKey] = [];
        }
        
        // Check if object is already in this cell to prevent duplicates
        if (!this.cells[cellKey].includes(obj)) {
            this.cells[cellKey].push(obj);
            obj.cellKey = cellKey;
        }
    }
    
    // Remove object from grid
    remove(obj) {
        if (!obj || !obj.cellKey) return;
        
        const cell = this.cells[obj.cellKey];
        if (!cell) return;
        
        const index = cell.indexOf(obj);
        if (index !== -1) {
            cell.splice(index, 1);
        }
        
        // Clean up empty cells to prevent memory leaks
        if (cell.length === 0) {
            delete this.cells[obj.cellKey];
        }
        
        obj.cellKey = null;
    }
    
    // Update object position in grid
    update(obj) {
        // Skip if object has no position or size
        if (obj.x === undefined || obj.y === undefined || 
            obj.width === undefined || obj.height === undefined) {
            return;
        }
        
        // Calculate cell coordinates based on object center
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        
        const newCellX = Math.floor(centerX / this.cellSize);
        const newCellY = Math.floor(centerY / this.cellSize);
        const newCellKey = `${newCellX},${newCellY}`;
        
        // Only update if object has moved to a new cell
        if (obj.cellKey !== newCellKey) {
            this.remove(obj);
            this.add(obj);
        }
    }
    
    // Get nearby objects within a radius
    getNearby(obj, radius) {
        // Calculate cell bounds that could contain objects within radius
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        
        const startCellX = Math.floor((centerX - radius) / this.cellSize);
        const startCellY = Math.floor((centerY - radius) / this.cellSize);
        const endCellX = Math.floor((centerX + radius) / this.cellSize);
        const endCellY = Math.floor((centerY + radius) / this.cellSize);
        
        const result = [];
        const addedObjects = new Set(); // Track added objects to prevent duplicates
        
        for (let cellX = startCellX; cellX <= endCellX; cellX++) {
            for (let cellY = startCellY; cellY <= endCellY; cellY++) {
                const cellKey = `${cellX},${cellY}`;
                const cell = this.cells[cellKey];
                
                if (cell) {
                    for (const object of cell) {
                        // Skip if object is already in results
                        if (!addedObjects.has(object) && object !== obj) {
                            result.push(object);
                            addedObjects.add(object);
                        }
                    }
                }
            }
        }
        
        return result;
    }
    
    // Get all objects in a specific cell
    getObjectsInCell(cellX, cellY) {
        const cellKey = `${cellX},${cellY}`;
        return this.cells[cellKey] || [];
    }
    
    // Get cell coordinates for a position
    getCellCoords(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return { cellX, cellY };
    }
    
    // Debug: Get total number of objects in grid
    getObjectCount() {
        let count = 0;
        for (const cellKey in this.cells) {
            count += this.cells[cellKey].length;
        }
        return count;
    }
    
    // Debug: Draw grid cells for visualization
    debugDraw(ctx, camera) {
        // Draw all occupied cells
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        
        for (const cellKey in this.cells) {
            if (this.cells[cellKey].length > 0) {
                const [cellX, cellY] = cellKey.split(',').map(Number);
                
                const screenX = cellX * this.cellSize - camera.x;
                const screenY = cellY * this.cellSize - camera.y;
                
                // Only draw cells visible on screen
                if (screenX + this.cellSize >= 0 && 
                    screenX <= camera.width && 
                    screenY + this.cellSize >= 0 && 
                    screenY <= camera.height) {
                    
                    ctx.strokeRect(
                        screenX, 
                        screenY, 
                        this.cellSize, 
                        this.cellSize
                    );
                    
                    // Optionally show object count in cell
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.font = '10px Arial';
                    ctx.fillText(
                        this.cells[cellKey].length.toString(),
                        screenX + 5,
                        screenY + 15
                    );
                }
            }
        }
    }
}