// networkEntity.js - Network entity management and interpolation

export class NetworkEntityManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.localEntities = new Map();
        this.interpolationDelay = 100; // 100ms interpolation buffer
        this.lastServerTick = 0;
        this.clientTick = 0;
        
        // Client prediction
        this.predictedStates = new Map();
        this.inputBuffer = [];
        this.lastAcknowledgedInput = 0;
    }
    
    // Register local entity for network tracking
    registerEntity(entity, isLocal = false) {
        const id = this.gameState.addEntity(entity);
        
        this.localEntities.set(id, {
            entity,
            isLocal,
            lastSentPosition: { x: entity.x, y: entity.y },
            positionThreshold: 1.0, // Minimum distance before sending update
            lastSentAngle: entity.angle || 0,
            angleThreshold: 0.1 // Minimum angle change before sending update
        });
        
        return id;
    }
    
    // Update entity from local game object
    updateFromLocal(entity) {
        if (!entity.id) return;
        
        const localData = this.localEntities.get(entity.id);
        if (!localData) return;
        
        // Check if update is needed
        const positionChanged = 
            Math.abs(entity.x - localData.lastSentPosition.x) > localData.positionThreshold ||
            Math.abs(entity.y - localData.lastSentPosition.y) > localData.positionThreshold;
            
        const angleChanged = entity.angle !== undefined && 
            Math.abs(entity.angle - localData.lastSentAngle) > localData.angleThreshold;
        
        if (positionChanged || angleChanged) {
            const updates = {
                x: entity.x,
                y: entity.y
            };
            
            if (entity.angle !== undefined) {
                updates.angle = entity.angle;
            }
            
            if (entity.health !== undefined) {
                updates.health = entity.health;
            }
            
            this.gameState.updateEntity(entity.id, updates);
            
            // Update last sent values
            if (positionChanged) {
                localData.lastSentPosition.x = entity.x;
                localData.lastSentPosition.y = entity.y;
            }
            if (angleChanged) {
                localData.lastSentAngle = entity.angle;
            }
            
            return true; // Indicates network update needed
        }
        
        return false;
    }
    
    // Apply interpolated state to local entities
    applyInterpolatedState(renderTime) {
        // Calculate interpolation ticks
        const serverTime = this.lastServerTick - this.interpolationDelay;
        const fromTick = Math.floor(serverTime / 16.67); // 60Hz ticks
        const toTick = fromTick + 1;
        const alpha = (serverTime % 16.67) / 16.67;
        
        for (const [id, localData] of this.localEntities) {
            // Skip locally controlled entities (use prediction instead)
            if (localData.isLocal) continue;
            
            const interpolated = this.gameState.getInterpolatedEntity(
                id, 
                fromTick, 
                toTick, 
                alpha
            );
            
            if (interpolated) {
                // Apply interpolated position to visual representation
                localData.entity.x = interpolated.x;
                localData.entity.y = interpolated.y;
                
                if (localData.entity.angle !== undefined) {
                    localData.entity.angle = interpolated.angle;
                }
                
                // Apply non-interpolated properties directly
                if (localData.entity.health !== undefined) {
                    localData.entity.health = interpolated.health;
                }
            }
        }
    }
    
    // Client-side prediction for local player
    predictMovement(player, input, deltaTime) {
        // Store input for later reconciliation
        const inputFrame = {
            sequence: ++this.clientTick,
            input: { ...input },
            deltaTime
        };
        this.inputBuffer.push(inputFrame);
        
        // Apply input locally (prediction)
        this.applyInput(player, input, deltaTime);
        
        // Store predicted state
        this.predictedStates.set(inputFrame.sequence, {
            x: player.x,
            y: player.y,
            angle: player.angle
        });
        
        // Clean old predictions
        if (this.predictedStates.size > 60) {
            const oldestKey = this.predictedStates.keys().next().value;
            this.predictedStates.delete(oldestKey);
        }
        
        return inputFrame;
    }
    
    // Apply input to entity (used for prediction and reconciliation)
    applyInput(entity, input, deltaTime) {
        // This should match server-side movement logic
        const speed = entity.speed || 4;
        
        if (input.up) entity.y -= speed * deltaTime;
        if (input.down) entity.y += speed * deltaTime;
        if (input.left) entity.x -= speed * deltaTime;
        if (input.right) entity.x += speed * deltaTime;
        
        // Update angle based on mouse position
        if (input.mouseX !== undefined && input.mouseY !== undefined) {
            const dx = input.mouseX - entity.x;
            const dy = input.mouseY - entity.y;
            entity.angle = Math.atan2(dy, dx);
        }
    }
    
    // Reconcile client prediction with server state
    reconcileWithServer(serverState, lastProcessedInput) {
        this.lastAcknowledgedInput = lastProcessedInput;
        
        // Find local player entity
        let localPlayer = null;
        for (const [id, localData] of this.localEntities) {
            if (localData.isLocal) {
                localPlayer = localData.entity;
                break;
            }
        }
        
        if (!localPlayer || !localPlayer.id) return;
        
        // Get server state for player
        const serverPlayer = serverState.entities.get(localPlayer.id);
        if (!serverPlayer) return;
        
        // Apply server state
        localPlayer.x = serverPlayer.x;
        localPlayer.y = serverPlayer.y;
        
        // Re-apply unacknowledged inputs
        let i = 0;
        while (i < this.inputBuffer.length) {
            const inputFrame = this.inputBuffer[i];
            
            if (inputFrame.sequence <= lastProcessedInput) {
                // This input has been processed by server, remove it
                this.inputBuffer.splice(i, 1);
            } else {
                // Re-apply this input
                this.applyInput(localPlayer, inputFrame.input, inputFrame.deltaTime);
                i++;
            }
        }
    }
    
    // Get network packet for current frame
    getNetworkUpdate() {
        const updates = [];
        
        for (const [id, localData] of this.localEntities) {
            if (localData.isLocal) {
                // Include latest input sequence for local entities
                const entity = this.gameState.entities.get(id);
                if (entity) {
                    updates.push({
                        id,
                        input: this.inputBuffer.length > 0 ? 
                            this.inputBuffer[this.inputBuffer.length - 1] : null
                    });
                }
            }
        }
        
        return {
            tick: this.gameState.tick,
            updates,
            state: this.gameState.serialize()
        };
    }
    
    // Process incoming network update
    processNetworkUpdate(packet) {
        // Update server tick
        this.lastServerTick = packet.tick;
        
        // Deserialize state
        this.gameState.deserialize(packet.state);
        
        // Handle reconciliation if this is the local player's update
        if (packet.lastProcessedInput !== undefined) {
            this.reconcileWithServer(this.gameState, packet.lastProcessedInput);
        }
    }
    
    // Clean up entity
    unregisterEntity(id) {
        this.localEntities.delete(id);
        this.gameState.removeEntity(id);
    }
}