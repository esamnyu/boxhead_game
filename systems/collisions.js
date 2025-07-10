// collisions.js - Collision detection and resolution system

import { rectPool } from '../utils/objectPool.js';

export class CollisionSystem {
    constructor(grid) {
        this.grid = grid;
    }
    
    // Check collision between two rectangles
    checkCollision(rectA, rectB) {
        return (
            rectA.x < rectB.x + rectB.width &&
            rectA.x + rectA.width > rectB.x &&
            rectA.y < rectB.y + rectB.height &&
            rectA.y + rectA.height > rectB.y
        );
    }
    
    // Check collision between a point and a rectangle
    checkPointCollision(point, rect) {
        return (
            point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height
        );
    }
    
    // Check collision between a circle and a rectangle
    checkCircleRectCollision(circle, rect) {
        // Find closest point on rectangle to circle center
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        
        // Calculate distance between closest point and circle center
        const distX = circle.x - closestX;
        const distY = circle.y - closestY;
        const distanceSquared = distX * distX + distY * distY;
        
        // If distance is less than circle radius, collision detected
        return distanceSquared < circle.radius * circle.radius;
    }
    
    // Check collision between two circles
    checkCircleCollision(circleA, circleB) {
        const dx = circleA.x - circleB.x;
        const dy = circleA.y - circleB.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSum = circleA.radius + circleB.radius;
        
        return distanceSquared < radiusSum * radiusSum;
    }
    
    // Resolve collision between an entity and obstacles
    resolveObstacleCollision(entity, obstacles) {
        // Get entity rectangle from pool
        const entityRect = rectPool.getForEntity(entity);
        
        // Get nearby obstacles using the grid
        const nearbyObstacles = this.grid.getNearby(entity, 100);
        
        for (const obstacle of nearbyObstacles) {
            // Skip non-obstacle objects
            if (!obstacles.includes(obstacle)) continue;
            
            // Check collision
            if (this.checkCollision(entityRect, obstacle)) {
                // Calculate overlap on each axis
                const overlapX = Math.min(
                    entityRect.x + entityRect.width - obstacle.x,
                    obstacle.x + obstacle.width - entityRect.x
                );
                
                const overlapY = Math.min(
                    entityRect.y + entityRect.height - obstacle.y,
                    obstacle.y + obstacle.height - entityRect.y
                );
                
                // Resolve collision based on the smallest overlap
                if (overlapX < overlapY) {
                    // X-axis resolution
                    if (entityRect.x < obstacle.x) {
                        entity.x = obstacle.x - entityRect.width / 2;
                    } else {
                        entity.x = obstacle.x + obstacle.width + entityRect.width / 2;
                    }
                } else {
                    // Y-axis resolution
                    if (entityRect.y < obstacle.y) {
                        entity.y = obstacle.y - entityRect.height / 2;
                    } else {
                        entity.y = obstacle.y + obstacle.height + entityRect.height / 2;
                    }
                }
                
                // Update entity rectangle
                entityRect.x = entity.x - entity.width / 2;
                entityRect.y = entity.y - entity.height / 2;
            }
        }
        
        // Rectangle will be automatically released at frame end
    }
    
    // Check if a line segment intersects with a rectangle
    checkLineRectIntersection(startX, startY, endX, endY, rect) {
        // Check if either endpoint is inside the rectangle
        if (this.checkPointCollision({x: startX, y: startY}, rect) ||
            this.checkPointCollision({x: endX, y: endY}, rect)) {
            return true;
        }
        
        // Check intersection with each edge of the rectangle
        const lines = [
            // Top edge
            {x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y},
            // Right edge
            {x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height},
            // Bottom edge
            {x1: rect.x, y1: rect.y + rect.height, x2: rect.x + rect.width, y2: rect.y + rect.height},
            // Left edge
            {x1: rect.x, y1: rect.y, x2: rect.x, y2: rect.y + rect.height}
        ];
        
        for (const line of lines) {
            if (this.checkLineIntersection(startX, startY, endX, endY, line.x1, line.y1, line.x2, line.y2)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Helper: Check if two line segments intersect
    checkLineIntersection(line1StartX, line1StartY, line1EndX, line1EndY, 
                         line2StartX, line2StartY, line2EndX, line2EndY) {
        // Calculate line directions
        const a1 = line1EndY - line1StartY;
        const b1 = line1StartX - line1EndX;
        const c1 = a1 * line1StartX + b1 * line1StartY;
        
        const a2 = line2EndY - line2StartY;
        const b2 = line2StartX - line2EndX;
        const c2 = a2 * line2StartX + b2 * line2StartY;
        
        const determinant = a1 * b2 - a2 * b1;
        
        if (determinant === 0) {
            // Lines are parallel
            return false;
        } else {
            // Calculate intersection point
            const x = (b2 * c1 - b1 * c2) / determinant;
            const y = (a1 * c2 - a2 * c1) / determinant;
            
            // Check if intersection point is on both line segments
            return (
                x >= Math.min(line1StartX, line1EndX) && x <= Math.max(line1StartX, line1EndX) &&
                y >= Math.min(line1StartY, line1EndY) && y <= Math.max(line1StartY, line1EndY) &&
                x >= Math.min(line2StartX, line2EndX) && x <= Math.max(line2StartX, line2EndX) &&
                y >= Math.min(line2StartY, line2EndY) && y <= Math.max(line2StartY, line2EndY)
            );
        }
    }
    
    // Check line of sight between two points
    checkLineOfSight(startX, startY, endX, endY, obstacles) {
        // Get obstacles that could potentially block line of sight
        const lineRect = rectPool.getBounds(
            Math.min(startX, endX) - 20,
            Math.min(startY, endY) - 20,
            Math.abs(endX - startX) + 40,
            Math.abs(endY - startY) + 40
        );
        
        const potentialObstacles = this.grid.getNearby(lineRect, 0);
        
        for (const obstacle of potentialObstacles) {
            // Skip non-obstacle objects
            if (!obstacles.includes(obstacle)) continue;
            
            // Check if line intersects with obstacle
            if (this.checkLineRectIntersection(startX, startY, endX, endY, obstacle)) {
                return false; // Line of sight blocked
            }
        }
        
        return true; // Clear line of sight
    }
}

// Export standalone collision check for use in other modules
export function checkCollision(rectA, rectB) {
    return (
        rectA.x < rectB.x + rectB.width &&
        rectA.x + rectA.width > rectB.x &&
        rectA.y < rectB.y + rectB.height &&
        rectA.y + rectA.height > rectB.y
    );
}