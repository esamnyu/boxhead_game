// input.js - Keyboard and mouse input handling

export class InputManager {
    constructor() {
        // Keyboard state
        this.keys = {};
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.worldMouseX = 0;
        this.worldMouseY = 0;
        this.isShooting = false;
        
        // Binding event handlers to maintain context
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }
    
    // Initialize input event listeners
    init() {
        // Add keyboard event listeners
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        
        // Add mouse event listeners
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            gameCanvas.addEventListener('mousemove', this.onMouseMove);
            gameCanvas.addEventListener('mousedown', this.onMouseDown);
            gameCanvas.addEventListener('mouseup', this.onMouseUp);
            
            // Prevent right-click menu on canvas
            gameCanvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
        } else {
            console.error('Game canvas not found');
        }
    }
    
    // Clean up event listeners
    destroy() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            gameCanvas.removeEventListener('mousemove', this.onMouseMove);
            gameCanvas.removeEventListener('mousedown', this.onMouseDown);
            gameCanvas.removeEventListener('mouseup', this.onMouseUp);
            gameCanvas.removeEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
        }
    }
    
    // Key down event handler
    onKeyDown(e) {
        this.keys[e.key] = true;
        
        // Prevent default actions for arrow keys and space
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    }
    
    // Key up event handler
    onKeyUp(e) {
        this.keys[e.key] = false;
    }
    
    // Mouse move event handler
    onMouseMove(e) {
        const rect = e.target.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
    }
    
    // Mouse down event handler
    onMouseDown(e) {
        if (e.button === 0) { // Left mouse button
            this.isShooting = true;
        }
    }
    
    // Mouse up event handler
    onMouseUp(e) {
        if (e.button === 0) { // Left mouse button
            this.isShooting = false;
        }
    }
    
    // Check if a key is currently pressed
    isKeyPressed(key) {
        return this.keys[key] === true;
    }
    
    // Update world mouse position based on camera
    updateWorldMousePosition(camera) {
        this.worldMouseX = this.mouseX + camera.x;
        this.worldMouseY = this.mouseY + camera.y;
    }
    
    // Get current input state (useful for debugging)
    getInputState() {
        return {
            keys: {...this.keys},
            mouseX: this.mouseX,
            mouseY: this.mouseY,
            worldMouseX: this.worldMouseX,
            worldMouseY: this.worldMouseY,
            isShooting: this.isShooting
        };
    }
    
    // Reset all input state (for scene transitions etc)
    reset() {
        this.keys = {};
        this.isShooting = false;
    }
}