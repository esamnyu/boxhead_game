// binarySerializer.js - Efficient binary serialization for network packets

export class BinarySerializer {
    constructor() {
        // Define entity property mappings
        this.propertyMap = {
            id: { type: 'uint16', bits: 16 },
            type: { type: 'enum', bits: 3, values: ['player', 'enemy', 'bullet', 'powerup'] },
            x: { type: 'fixed', bits: 16, min: 0, max: 5000, precision: 1 },
            y: { type: 'fixed', bits: 16, min: 0, max: 5000, precision: 1 },
            angle: { type: 'angle', bits: 8 }, // 256 directions
            health: { type: 'uint8', bits: 8 },
            maxHealth: { type: 'uint8', bits: 8 },
            width: { type: 'uint8', bits: 8 },
            height: { type: 'uint8', bits: 8 },
            owner: { type: 'uint16', bits: 16 }
        };
        
        // Bit buffer for efficient packing
        this.buffer = null;
        this.bitPosition = 0;
    }
    
    // Serialize game state to binary
    serialize(state) {
        // Estimate buffer size
        const bufferSize = this.estimateSize(state);
        this.buffer = new ArrayBuffer(bufferSize);
        this.view = new DataView(this.buffer);
        this.bitPosition = 0;
        
        // Write header
        this.writeUint8(state.type === 'delta' ? 1 : 0); // State type
        this.writeUint32(state.data.tick); // Tick number
        this.writeUint32(state.data.timestamp); // Timestamp
        
        if (state.type === 'delta') {
            this.serializeDelta(state.data);
        } else {
            this.serializeFull(state.data);
        }
        
        // Return only used portion of buffer
        const usedBytes = Math.ceil(this.bitPosition / 8);
        return this.buffer.slice(0, usedBytes);
    }
    
    // Deserialize binary data to game state
    deserialize(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this.bitPosition = 0;
        
        // Read header
        const stateType = this.readUint8();
        const tick = this.readUint32();
        const timestamp = this.readUint32();
        
        const state = {
            type: stateType === 1 ? 'delta' : 'full',
            data: {
                tick,
                timestamp
            }
        };
        
        if (state.type === 'delta') {
            this.deserializeDelta(state.data);
        } else {
            this.deserializeFull(state.data);
        }
        
        return state;
    }
    
    // Serialize delta state
    serializeDelta(delta) {
        // Write counts
        this.writeUint16(delta.created.length);
        this.writeUint16(delta.updated.length);
        this.writeUint16(delta.removed.length);
        
        // Write created entities
        for (const entity of delta.created) {
            this.serializeEntity(entity, true);
        }
        
        // Write updated entities
        for (const updates of delta.updated) {
            this.serializeEntityUpdate(updates);
        }
        
        // Write removed entity IDs
        for (const id of delta.removed) {
            this.writeUint16(id);
        }
    }
    
    // Deserialize delta state
    deserializeDelta(delta) {
        // Read counts
        const createdCount = this.readUint16();
        const updatedCount = this.readUint16();
        const removedCount = this.readUint16();
        
        // Read created entities
        delta.created = [];
        for (let i = 0; i < createdCount; i++) {
            delta.created.push(this.deserializeEntity(true));
        }
        
        // Read updated entities
        delta.updated = [];
        for (let i = 0; i < updatedCount; i++) {
            delta.updated.push(this.deserializeEntityUpdate());
        }
        
        // Read removed entity IDs
        delta.removed = [];
        for (let i = 0; i < removedCount; i++) {
            delta.removed.push(this.readUint16());
        }
    }
    
    // Serialize full state
    serializeFull(data) {
        // Write entity count
        this.writeUint16(data.entities.length);
        
        // Write all entities
        for (const entity of data.entities) {
            this.serializeEntity(entity, true);
        }
    }
    
    // Deserialize full state
    deserializeFull(data) {
        // Read entity count
        const entityCount = this.readUint16();
        
        // Read all entities
        data.entities = [];
        for (let i = 0; i < entityCount; i++) {
            data.entities.push(this.deserializeEntity(true));
        }
    }
    
    // Serialize single entity
    serializeEntity(entity, includeMask = false) {
        if (includeMask) {
            // Write property mask to indicate which properties are included
            let mask = 0;
            let bitIndex = 0;
            
            for (const prop in this.propertyMap) {
                if (entity[prop] !== undefined) {
                    mask |= (1 << bitIndex);
                }
                bitIndex++;
            }
            
            this.writeUint16(mask);
        }
        
        // Write properties
        for (const prop in this.propertyMap) {
            if (entity[prop] !== undefined) {
                this.writeProperty(prop, entity[prop]);
            }
        }
    }
    
    // Deserialize single entity
    deserializeEntity(hasMask = false) {
        const entity = {};
        let mask = 0xFFFF; // All properties by default
        
        if (hasMask) {
            mask = this.readUint16();
        }
        
        let bitIndex = 0;
        for (const prop in this.propertyMap) {
            if (mask & (1 << bitIndex)) {
                entity[prop] = this.readProperty(prop);
            }
            bitIndex++;
        }
        
        return entity;
    }
    
    // Serialize entity update (only changed properties)
    serializeEntityUpdate(updates) {
        // Always include ID
        this.writeUint16(updates.id);
        
        // Write property mask
        let mask = 0;
        let bitIndex = 0;
        
        for (const prop in this.propertyMap) {
            if (prop !== 'id' && updates[prop] !== undefined) {
                mask |= (1 << bitIndex);
            }
            bitIndex++;
        }
        
        this.writeUint8(mask);
        
        // Write updated properties
        for (const prop in updates) {
            if (prop !== 'id' && this.propertyMap[prop]) {
                this.writeProperty(prop, updates[prop]);
            }
        }
    }
    
    // Deserialize entity update
    deserializeEntityUpdate() {
        const updates = {};
        
        // Read ID
        updates.id = this.readUint16();
        
        // Read property mask
        const mask = this.readUint8();
        
        // Read updated properties
        let bitIndex = 0;
        for (const prop in this.propertyMap) {
            if (prop !== 'id' && (mask & (1 << bitIndex))) {
                updates[prop] = this.readProperty(prop);
            }
            bitIndex++;
        }
        
        return updates;
    }
    
    // Write property based on type
    writeProperty(prop, value) {
        const config = this.propertyMap[prop];
        
        switch (config.type) {
            case 'uint8':
                this.writeUint8(value);
                break;
            case 'uint16':
                this.writeUint16(value);
                break;
            case 'fixed':
                this.writeFixed(value, config);
                break;
            case 'angle':
                this.writeAngle(value, config.bits);
                break;
            case 'enum':
                this.writeEnum(value, config);
                break;
        }
    }
    
    // Read property based on type
    readProperty(prop) {
        const config = this.propertyMap[prop];
        
        switch (config.type) {
            case 'uint8':
                return this.readUint8();
            case 'uint16':
                return this.readUint16();
            case 'fixed':
                return this.readFixed(config);
            case 'angle':
                return this.readAngle(config.bits);
            case 'enum':
                return this.readEnum(config);
        }
    }
    
    // Fixed-point number serialization
    writeFixed(value, config) {
        const normalized = (value - config.min) / (config.max - config.min);
        const quantized = Math.round(normalized * ((1 << config.bits) - 1));
        this.writeBits(quantized, config.bits);
    }
    
    readFixed(config) {
        const quantized = this.readBits(config.bits);
        const normalized = quantized / ((1 << config.bits) - 1);
        return config.min + normalized * (config.max - config.min);
    }
    
    // Angle serialization (0-2π to N bits)
    writeAngle(angle, bits) {
        const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const quantized = Math.round(normalized / (Math.PI * 2) * ((1 << bits) - 1));
        this.writeBits(quantized, bits);
    }
    
    readAngle(bits) {
        const quantized = this.readBits(bits);
        return (quantized / ((1 << bits) - 1)) * Math.PI * 2;
    }
    
    // Enum serialization
    writeEnum(value, config) {
        const index = config.values.indexOf(value);
        this.writeBits(index >= 0 ? index : 0, config.bits);
    }
    
    readEnum(config) {
        const index = this.readBits(config.bits);
        return config.values[index] || config.values[0];
    }
    
    // Low-level bit operations
    writeBits(value, bits) {
        for (let i = bits - 1; i >= 0; i--) {
            const bit = (value >> i) & 1;
            const byteIndex = Math.floor(this.bitPosition / 8);
            const bitIndex = 7 - (this.bitPosition % 8);
            
            if (bit) {
                this.view.setUint8(byteIndex, 
                    this.view.getUint8(byteIndex) | (1 << bitIndex));
            }
            
            this.bitPosition++;
        }
    }
    
    readBits(bits) {
        let value = 0;
        
        for (let i = bits - 1; i >= 0; i--) {
            const byteIndex = Math.floor(this.bitPosition / 8);
            const bitIndex = 7 - (this.bitPosition % 8);
            const bit = (this.view.getUint8(byteIndex) >> bitIndex) & 1;
            
            value |= (bit << i);
            this.bitPosition++;
        }
        
        return value;
    }
    
    // Standard byte operations
    writeUint8(value) {
        const byteIndex = Math.floor(this.bitPosition / 8);
        this.view.setUint8(byteIndex, value);
        this.bitPosition += 8;
    }
    
    readUint8() {
        const byteIndex = Math.floor(this.bitPosition / 8);
        const value = this.view.getUint8(byteIndex);
        this.bitPosition += 8;
        return value;
    }
    
    writeUint16(value) {
        this.writeBits(value, 16);
    }
    
    readUint16() {
        return this.readBits(16);
    }
    
    writeUint32(value) {
        this.writeBits(value >>> 16, 16);
        this.writeBits(value & 0xFFFF, 16);
    }
    
    readUint32() {
        const high = this.readBits(16);
        const low = this.readBits(16);
        return (high << 16) | low;
    }
    
    // Estimate buffer size needed
    estimateSize(state) {
        // Conservative estimate
        if (state.type === 'delta') {
            const delta = state.data;
            return 9 + // Header
                   2 * 3 + // Counts
                   delta.created.length * 32 + // Created entities
                   delta.updated.length * 16 + // Updates
                   delta.removed.length * 2; // Removed IDs
        } else {
            return 9 + // Header
                   2 + // Count
                   state.data.entities.length * 32; // Full entities
        }
    }
}

// Export singleton instance
export const binarySerializer = new BinarySerializer();