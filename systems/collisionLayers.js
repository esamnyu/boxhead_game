// collisionLayers.js - Collision layer system for efficient collision filtering

export const CollisionLayers = {
    // Define collision layers as bit flags
    NONE: 0,
    PLAYER: 1 << 0,        // 1
    ENEMY: 1 << 1,         // 2
    PLAYER_BULLET: 1 << 2, // 4
    ENEMY_BULLET: 1 << 3,  // 8
    OBSTACLE: 1 << 4,      // 16
    POWERUP: 1 << 5,       // 32
    EXPLOSION: 1 << 6,     // 64
    
    // Define what each layer collides with
    COLLISION_MATRIX: {
        PLAYER: (1 << 1) | (1 << 3) | (1 << 4) | (1 << 5), // Collides with: ENEMY, ENEMY_BULLET, OBSTACLE, POWERUP
        ENEMY: (1 << 0) | (1 << 2) | (1 << 4),             // Collides with: PLAYER, PLAYER_BULLET, OBSTACLE
        PLAYER_BULLET: (1 << 1) | (1 << 4),                // Collides with: ENEMY, OBSTACLE
        ENEMY_BULLET: (1 << 0) | (1 << 4),                 // Collides with: PLAYER, OBSTACLE
        OBSTACLE: 0xFF,                                     // Collides with everything
        POWERUP: (1 << 0),                                  // Collides with: PLAYER
        EXPLOSION: (1 << 1)                                 // Collides with: ENEMY
    }
};

// Helper functions for collision layer management
export const CollisionLayerUtils = {
    // Check if two layers should collide
    shouldCollide(layerA, layerB) {
        const matrixA = CollisionLayers.COLLISION_MATRIX[this.getLayerName(layerA)];
        const matrixB = CollisionLayers.COLLISION_MATRIX[this.getLayerName(layerB)];
        
        // Check if either layer has the other in its collision matrix
        return (matrixA & layerB) !== 0 || (matrixB & layerA) !== 0;
    },
    
    // Get layer name from bit flag
    getLayerName(layer) {
        switch(layer) {
            case CollisionLayers.PLAYER: return 'PLAYER';
            case CollisionLayers.ENEMY: return 'ENEMY';
            case CollisionLayers.PLAYER_BULLET: return 'PLAYER_BULLET';
            case CollisionLayers.ENEMY_BULLET: return 'ENEMY_BULLET';
            case CollisionLayers.OBSTACLE: return 'OBSTACLE';
            case CollisionLayers.POWERUP: return 'POWERUP';
            case CollisionLayers.EXPLOSION: return 'EXPLOSION';
            default: return 'NONE';
        }
    },
    
    // Add collision layer to entity
    addLayer(entity, layer) {
        if (!entity.collisionLayer) {
            entity.collisionLayer = CollisionLayers.NONE;
        }
        entity.collisionLayer |= layer;
    },
    
    // Remove collision layer from entity
    removeLayer(entity, layer) {
        if (entity.collisionLayer) {
            entity.collisionLayer &= ~layer;
        }
    },
    
    // Check if entity has specific layer
    hasLayer(entity, layer) {
        return entity.collisionLayer && (entity.collisionLayer & layer) !== 0;
    }
};