// gameState.js - Network-ready state management system

export class GameState {
    constructor() {
        // Core game state
        this.tick = 0;
        this.entities = new Map();
        this.lastEntityId = 0;
        
        // State snapshots for networking
        this.snapshots = [];
        this.maxSnapshots = 60; // Keep 1 second of history at 60 ticks/sec
        
        // Delta compression
        this.lastSentState = null;
    }
    
    // Generate unique entity ID
    generateEntityId() {
        return ++this.lastEntityId;
    }
    
    // Add entity to state
    addEntity(entity) {
        if (!entity.id) {
            entity.id = this.generateEntityId();
        }
        
        this.entities.set(entity.id, {
            id: entity.id,
            type: entity.entityType || entity.type,
            x: entity.x,
            y: entity.y,
            width: entity.width,
            height: entity.height,
            angle: entity.angle || 0,
            health: entity.health,
            maxHealth: entity.maxHealth,
            owner: entity.owner || null,
            lastUpdate: this.tick
        });
        
        return entity.id;
    }
    
    // Update entity state
    updateEntity(id, updates) {
        const entity = this.entities.get(id);
        if (!entity) return false;
        
        // Only update changed properties
        let changed = false;
        for (const key in updates) {
            if (entity[key] !== updates[key]) {
                entity[key] = updates[key];
                changed = true;
            }
        }
        
        if (changed) {
            entity.lastUpdate = this.tick;
        }
        
        return changed;
    }
    
    // Remove entity from state
    removeEntity(id) {
        return this.entities.delete(id);
    }
    
    // Create state snapshot
    createSnapshot() {
        const snapshot = {
            tick: this.tick,
            timestamp: Date.now(),
            entities: new Map()
        };
        
        // Copy entity states
        for (const [id, entity] of this.entities) {
            snapshot.entities.set(id, { ...entity });
        }
        
        // Add to history
        this.snapshots.push(snapshot);
        
        // Trim old snapshots
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }
        
        return snapshot;
    }
    
    // Get snapshot at specific tick
    getSnapshot(tick) {
        for (let i = this.snapshots.length - 1; i >= 0; i--) {
            if (this.snapshots[i].tick <= tick) {
                return this.snapshots[i];
            }
        }
        return null;
    }
    
    // Create delta between two states
    createDelta(fromState, toState) {
        const delta = {
            tick: toState.tick,
            timestamp: toState.timestamp,
            created: [],
            updated: [],
            removed: []
        };
        
        // Find created and updated entities
        for (const [id, entity] of toState.entities) {
            const oldEntity = fromState ? fromState.entities.get(id) : null;
            
            if (!oldEntity) {
                // Entity was created
                delta.created.push(entity);
            } else {
                // Check if entity was updated
                const updates = {};
                let hasChanges = false;
                
                for (const key in entity) {
                    if (key === 'lastUpdate') continue;
                    if (entity[key] !== oldEntity[key]) {
                        updates[key] = entity[key];
                        hasChanges = true;
                    }
                }
                
                if (hasChanges) {
                    updates.id = id;
                    delta.updated.push(updates);
                }
            }
        }
        
        // Find removed entities
        if (fromState) {
            for (const [id, entity] of fromState.entities) {
                if (!toState.entities.has(id)) {
                    delta.removed.push(id);
                }
            }
        }
        
        return delta;
    }
    
    // Apply delta to current state
    applyDelta(delta) {
        // Create new entities
        for (const entity of delta.created) {
            this.entities.set(entity.id, { ...entity });
        }
        
        // Update existing entities
        for (const updates of delta.updated) {
            const entity = this.entities.get(updates.id);
            if (entity) {
                for (const key in updates) {
                    if (key !== 'id') {
                        entity[key] = updates[key];
                    }
                }
            }
        }
        
        // Remove deleted entities
        for (const id of delta.removed) {
            this.entities.delete(id);
        }
        
        this.tick = delta.tick;
    }
    
    // Serialize state for network transmission
    serialize(useDelta = true) {
        const currentSnapshot = this.createSnapshot();
        
        if (useDelta && this.lastSentState) {
            // Send delta
            return {
                type: 'delta',
                data: this.createDelta(this.lastSentState, currentSnapshot)
            };
        } else {
            // Send full state
            this.lastSentState = currentSnapshot;
            return {
                type: 'full',
                data: {
                    tick: currentSnapshot.tick,
                    timestamp: currentSnapshot.timestamp,
                    entities: Array.from(currentSnapshot.entities.values())
                }
            };
        }
    }
    
    // Deserialize state from network
    deserialize(packet) {
        if (packet.type === 'delta') {
            this.applyDelta(packet.data);
        } else if (packet.type === 'full') {
            // Replace entire state
            this.entities.clear();
            this.tick = packet.data.tick;
            
            for (const entity of packet.data.entities) {
                this.entities.set(entity.id, entity);
            }
        }
    }
    
    // Get interpolated entity state between two ticks
    getInterpolatedEntity(id, fromTick, toTick, alpha) {
        const fromSnapshot = this.getSnapshot(fromTick);
        const toSnapshot = this.getSnapshot(toTick);
        
        if (!fromSnapshot || !toSnapshot) return null;
        
        const fromEntity = fromSnapshot.entities.get(id);
        const toEntity = toSnapshot.entities.get(id);
        
        if (!fromEntity || !toEntity) return null;
        
        // Interpolate position
        return {
            ...toEntity,
            x: fromEntity.x + (toEntity.x - fromEntity.x) * alpha,
            y: fromEntity.y + (toEntity.y - fromEntity.y) * alpha,
            angle: this.interpolateAngle(fromEntity.angle, toEntity.angle, alpha)
        };
    }
    
    // Helper to interpolate angles correctly
    interpolateAngle(from, to, alpha) {
        let diff = to - from;
        
        // Handle wrap-around
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        
        return from + diff * alpha;
    }
    
    // Advance game state by one tick
    tick() {
        this.tick++;
    }
}