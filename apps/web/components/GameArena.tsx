import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';

// Define the structure for objects that can be placed on the grid
interface GridObject {
    x: number;          // X position in grid coordinates
    y: number;          // Y position in grid coordinates
    width: number;      // Width of the object in grid cells
    height: number;     // Height of the object in grid cells
    type: string;       // Type of the object (e.g., 'tree', 'rock', etc.)
    sprite: Phaser.GameObjects.GameObject;  // The visual representation of the object
}

// Define the structure for elements that can be dragged from the sidebar
interface MapElement {
    id: string;         // Unique identifier for the element
    name: string;       // Display name of the element
    imageUrl: string;   // URL of the element's image
    type: string;       // Type of the element
    size: {
        width: number;  // Width in grid cells
        height: number; // Height in grid cells
    };
}

// Main game scene class that handles all game logic and rendering
class MainScene extends Phaser.Scene {
    // Player object that can be moved around the grid
    private player!: Phaser.GameObjects.Rectangle;
    
    // Keyboard input handler for player movement
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Constants for grid and game settings
    private readonly CELL_SIZE = 50;        // Size of each grid cell in pixels
    private readonly GRID_SIZE = 4000;      // Total size of the grid in pixels
    private readonly PLAYER_SIZE = 50;      // Size of the player in pixels
    private canMove = true;                 // Flag to control player movement
    private gridObjects: GridObject[] = []; // Array to store all objects on the grid
    
    // Camera zoom settings
    private readonly MIN_ZOOM = 0.5;        // Minimum zoom level
    private readonly MAX_ZOOM = 1.3;        // Maximum zoom level
    private readonly ZOOM_STEP = 0.01;      // How much to zoom in/out per step
    
    // Movement and interaction settings
    private readonly MOVE_DELAY = 150;      // Delay between moves in milliseconds
    private lastMoveTime = 0;               // Timestamp of last move
    private backgroundTiles!: Phaser.GameObjects.TileSprite;  // Background grid tiles
    private selectedObject: GridObject | null = null;  // Currently selected object
    private isDragging = false;             // Flag for drag operation
    private dragStartX = 0;                 // Starting X position of drag
    private dragStartY = 0;                 // Starting Y position of drag

    // Constructor for the scene
    constructor() {
        super({ key: 'MainScene' });  // 'MainScene' is the unique identifier for this scene
    }

    // Load all game assets (images, sprites, etc.)
    preload() {
        // Load the background tile image that will be used for the grid
        this.load.image('gridTile', '/tile.png');
        // Load the work desk image that can be placed on the grid
        this.load.image('work_desk', '/elements/work_desk.png');
    }

    // Find a safe position to spawn the player where there are no obstacles
    private findSafeSpawnPosition(): { x: number, y: number } {
        // Calculate the number of cells in the grid
        const numCells = this.GRID_SIZE / this.CELL_SIZE;
        // Find the center cell
        const centerCell = Math.floor(numCells / 2);
        
        // Start from center and spiral outward until we find a safe spot
        for (let layer = 0; layer < numCells / 2; layer++) {
            // Check each position in the current layer
            for (let i = -layer; i <= layer; i++) {
                for (let j = -layer; j <= layer; j++) {
                    const x = centerCell + i;
                    const y = centerCell + j;
                    
                    // Skip if we're not on the outer edge of this layer
                    if (Math.abs(i) !== layer && Math.abs(j) !== layer) continue;
                    
                    // Check if this position is safe (no obstacles)
                    const isSafe = !this.gridObjects.some(obj => 
                        x >= obj.x && x < obj.x + obj.width &&
                        y >= obj.y && y < obj.y + obj.height
                    );
                    
                    if (isSafe) {
                        // Convert grid coordinates to pixel coordinates
                        return {
                            x: x * this.CELL_SIZE + (this.CELL_SIZE / 2),
                            y: y * this.CELL_SIZE + (this.CELL_SIZE / 2)
                        };
                    }
                }
            }
        }
        
        // Fallback to center if no safe spot found
        return {
            x: centerCell * this.CELL_SIZE + (this.CELL_SIZE / 2),
            y: centerCell * this.CELL_SIZE + (this.CELL_SIZE / 2)
        };
    }

    // Initialize the game scene
    create() {
        // Create individual tiles for each cell in the grid
        const numCells = this.GRID_SIZE / this.CELL_SIZE;
        for (let x = 0; x < numCells; x++) {
            for (let y = 0; y < numCells; y++) {
                const tileX = x * this.CELL_SIZE;
                const tileY = y * this.CELL_SIZE;
                this.add.image(tileX, tileY, 'gridTile')
                    .setOrigin(0, 0)  // Set the origin point to top-left corner
                    .setDisplaySize(this.CELL_SIZE, this.CELL_SIZE);  // Set the size of each tile
            }
        }

        // Create the grid lines
        this.createGrid();

        // Find a safe position to spawn the player
        const safePosition = this.findSafeSpawnPosition();

        // Create the player as a green rectangle
        this.player = this.add.rectangle(
            safePosition.x,
            safePosition.y,
            this.PLAYER_SIZE * 0.8,
            this.PLAYER_SIZE * 0.8,
            0x00ff00  // Green color
        );
        this.player.setStrokeStyle(2, 0xffffff);  // Add white border

        // Set up the camera to follow the player
        this.cameras.main.setBounds(0, 0, this.GRID_SIZE, this.GRID_SIZE);  // Set camera boundaries
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);  // Make camera follow player smoothly
        this.cameras.main.setZoom(1);  // Set initial zoom level
        
        // Center the camera on the player
        this.cameras.main.centerOn(this.player.x, this.player.y);

        // Set up keyboard input for player movement
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Add mouse wheel zoom functionality
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
            const currentZoom = this.cameras.main.zoom;
            const zoomDelta = deltaY > 0 ? -this.ZOOM_STEP : this.ZOOM_STEP;
            const newZoom = Phaser.Math.Clamp(currentZoom + zoomDelta, this.MIN_ZOOM, this.MAX_ZOOM);
            
            // Get mouse position in world coordinates
            const mouseWorldX = this.cameras.main.scrollX + pointer.x / currentZoom;
            const mouseWorldY = this.cameras.main.scrollY + pointer.y / currentZoom;
            
            // Set new zoom level
            this.cameras.main.setZoom(newZoom);
            
            // Adjust camera position to zoom towards mouse
            const newMouseWorldX = this.cameras.main.scrollX + pointer.x / newZoom;
            const newMouseWorldY = this.cameras.main.scrollY + pointer.y / newZoom;
            
            this.cameras.main.scrollX += (mouseWorldX - newMouseWorldX);
            this.cameras.main.scrollY += (mouseWorldY - newMouseWorldY);
        });

        // Set up input handlers for element interaction
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.input.on('pointerout', this.handlePointerUp, this);

        // Make all existing sprites interactive
        this.gridObjects.forEach(obj => {
            if (obj.sprite instanceof Phaser.GameObjects.Image || 
                obj.sprite instanceof Phaser.GameObjects.Rectangle) {
                obj.sprite.setInteractive();
            }
        });

        console.log('Scene created successfully');
    }

    // Add a new object to the grid at specified coordinates
    private addObjectToGrid(gridX: number, gridY: number, type: string, color: number, width: number = 1, height: number = 1) {
        try {
            // Convert grid coordinates to pixel coordinates
            const x = gridX * this.CELL_SIZE + (width * this.CELL_SIZE) / 2;
            const y = gridY * this.CELL_SIZE + (height * this.CELL_SIZE) / 2;

            let sprite: Phaser.GameObjects.GameObject;

            // Create different types of objects based on the type parameter
            switch (type) {
                case 'work_desk':
                    // Create a work desk using an image
                    sprite = this.add.image(x, y, 'work_desk')
                        .setDisplaySize(width * this.CELL_SIZE, height * this.CELL_SIZE)
                        .setOrigin(0.5)  // Center the image
                        .setInteractive({ draggable: true });  // Make it draggable
                    break;
                case 'tree':
                    // Create a tree using graphics
                    const treeGraphics = this.add.graphics();
                    treeGraphics.fillStyle(0x228B22, 1);  // Dark green color
                    treeGraphics.fillCircle(x, y - 10, 15);  // Tree top
                    treeGraphics.fillStyle(0x8B4513, 1);  // Brown color
                    treeGraphics.fillRect(x - 5, y, 10, 20);  // Tree trunk
                    sprite = treeGraphics;
                    break;
                case 'rock':
                    // Create a rock using graphics
                    const rockGraphics = this.add.graphics();
                    rockGraphics.fillStyle(0x808080, 1);  // Gray color
                    rockGraphics.fillCircle(x, y, 20 * Math.max(width, height));  // Rock body
                    rockGraphics.fillStyle(0x696969, 1);  // Darker gray
                    rockGraphics.fillCircle(x - 5, y - 5, 5 * Math.max(width, height));  // Rock detail
                    sprite = rockGraphics;
                    break;
                case 'chest':
                    // Create a treasure chest using graphics
                    const chestGraphics = this.add.graphics();
                    chestGraphics.fillStyle(0x8B4513, 1);  // Brown color
                    chestGraphics.fillRect(x - 15, y - 10, 30, 20);  // Chest body
                    chestGraphics.fillStyle(0xFFD700, 1);  // Gold color
                    chestGraphics.fillRect(x - 12, y - 8, 24, 4);  // Chest lid
                    chestGraphics.fillRect(x - 8, y - 4, 16, 12);  // Chest front
                    sprite = chestGraphics;
                    break;
                case 'house':
                    // Create a house using graphics
                    const houseGraphics = this.add.graphics();
                    // House body
                    houseGraphics.fillStyle(0x8B4513, 1);  // Brown color
                    houseGraphics.fillRect(x - (width * this.CELL_SIZE) / 2, y - (height * this.CELL_SIZE) / 2, 
                        width * this.CELL_SIZE, height * this.CELL_SIZE);
                    // Roof
                    houseGraphics.fillStyle(0x800000, 1);  // Dark red color
                    houseGraphics.fillTriangle(
                        x - (width * this.CELL_SIZE) / 2, y - (height * this.CELL_SIZE) / 2,
                        x + (width * this.CELL_SIZE) / 2, y - (height * this.CELL_SIZE) / 2,
                        x, y - (height * this.CELL_SIZE) / 2 - 20
                    );
                    // Door
                    houseGraphics.fillStyle(0x4B2F0F, 1);  // Dark brown color
                    houseGraphics.fillRect(x - 10, y, 20, 30);
                    sprite = houseGraphics;
                    break;
                default:
                    // Create a default rectangle for unknown types
                    sprite = this.add.rectangle(
                        x,
                        y,
                        this.CELL_SIZE * width * 0.8,
                        this.CELL_SIZE * height * 0.8,
                        color
                    ).setInteractive({ draggable: true });
            }

            // Create a grid object to store the object's data
            const gridObject = {
                x: gridX,
                y: gridY,
                width,
                height,
                type,
                sprite
            };

            // Add the object to the grid objects array
            this.gridObjects.push(gridObject);

            // Add interaction handlers for the sprite
            if (sprite instanceof Phaser.GameObjects.Image || 
                sprite instanceof Phaser.GameObjects.Rectangle) {
                // Handle click events
                sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    if (pointer.rightButtonDown()) {
                        // Right click to deselect
                        this.deselectObject();
                    } else {
                        // Left click to select and start drag
                        this.selectObject(gridObject);
                        this.isDragging = true;
                        this.dragStartX = pointer.worldX;
                        this.dragStartY = pointer.worldY;
                    }
                });

                // Handle drag events
                sprite.on('drag', (pointer: Phaser.Input.Pointer) => {
                    if (this.isDragging && this.selectedObject) {
                        const gridX = Math.floor(pointer.worldX / this.CELL_SIZE);
                        const gridY = Math.floor(pointer.worldY / this.CELL_SIZE);
                        
                        // Update sprite position immediately for smooth movement
                        const newX = gridX * this.CELL_SIZE + (this.selectedObject.width * this.CELL_SIZE) / 2;
                        const newY = gridY * this.CELL_SIZE + (this.selectedObject.height * this.CELL_SIZE) / 2;
                        
                        if (this.selectedObject.sprite instanceof Phaser.GameObjects.Image || 
                            this.selectedObject.sprite instanceof Phaser.GameObjects.Rectangle) {
                            this.selectedObject.sprite.setPosition(newX, newY);
                        }
                        
                        // Check if new position is valid and different
                        if (!this.isPositionOccupied(gridX, gridY, this.selectedObject) && 
                            (gridX !== this.selectedObject.x || gridY !== this.selectedObject.y)) {
                            this.moveObjectToGrid(this.selectedObject, gridX, gridY);
                        }
                    }
                });

                // Handle drag end events
                sprite.on('dragend', () => {
                    this.isDragging = false;
                });
            }

        } catch (error) {
            console.error('Error adding object to grid:', error);
        }
    }

    // Helper method to find an object at specific grid coordinates
    getObjectAt(gridX: number, gridY: number): GridObject | undefined {
        return this.gridObjects.find(obj => 
            gridX >= obj.x && 
            gridX < obj.x + obj.width && 
            gridY >= obj.y && 
            gridY < obj.y + obj.height
        );
    }

    // Helper method to check if a grid position is occupied
    isPositionOccupied(gridX: number, gridY: number, excludeObject?: GridObject): boolean {
        return this.gridObjects.some(obj => {
            if (excludeObject && obj === excludeObject) return false;
            return gridX >= obj.x && 
                   gridX < obj.x + obj.width && 
                   gridY >= obj.y && 
                   gridY < obj.y + obj.height;
        });
    }

    // Move the player in the specified direction
    private movePlayer(dx: number, dy: number) {
        this.canMove = false;
        
        // Calculate new position in grid coordinates
        const newGridX = Math.floor((this.player.x + dx) / this.CELL_SIZE);
        const newGridY = Math.floor((this.player.y + dy) / this.CELL_SIZE);

        // Check if new position is occupied
        if (this.isPositionOccupied(newGridX, newGridY)) {
            this.canMove = true;
            return;
        }

        // Calculate new pixel position with bounds checking
        const newX = Phaser.Math.Clamp(
            this.player.x + dx,
            this.PLAYER_SIZE / 2,
            this.GRID_SIZE - this.PLAYER_SIZE / 2
        );
        const newY = Phaser.Math.Clamp(
            this.player.y + dy,
            this.PLAYER_SIZE / 2,
            this.GRID_SIZE - this.PLAYER_SIZE / 2
        );

        // Move player to new position
        this.player.x = newX;
        this.player.y = newY;

        // Update camera to follow player
        this.cameras.main.centerOn(newX, newY);

        // Re-enable movement after delay
        this.time.delayedCall(100, () => {
            this.canMove = true;
        });
    }

    // Create the grid lines
    private createGrid() {
        const graphics = this.add.graphics();
        
        // Draw minor grid lines (thinner, more frequent)
        graphics.lineStyle(1, 0xffffff, 0.05);
        for (let x = 0; x <= this.GRID_SIZE; x += this.CELL_SIZE) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.GRID_SIZE);
        }
        for (let y = 0; y <= this.GRID_SIZE; y += this.CELL_SIZE) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.GRID_SIZE, y);
        }

        // Draw major grid lines (thicker, less frequent)
        graphics.lineStyle(1, 0xffffff, 0.1);
        for (let x = 0; x <= this.GRID_SIZE; x += this.CELL_SIZE * 4) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.GRID_SIZE);
        }
        for (let y = 0; y <= this.GRID_SIZE; y += this.CELL_SIZE * 4) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.GRID_SIZE, y);
        }

        graphics.strokePath();
    }

    // Main game update loop
    update(time: number) {
        if (!this.canMove) return;

        // Check if enough time has passed since last move
        if (time - this.lastMoveTime < this.MOVE_DELAY) return;

        let moved = false;

        // Handle keyboard input for player movement
        if (this.cursors.left.isDown) {
            this.movePlayer(-this.CELL_SIZE, 0);
            moved = true;
        } else if (this.cursors.right.isDown) {
            this.movePlayer(this.CELL_SIZE, 0);
            moved = true;
        } else if (this.cursors.up.isDown) {
            this.movePlayer(0, -this.CELL_SIZE);
            moved = true;
        } else if (this.cursors.down.isDown) {
            this.movePlayer(0, this.CELL_SIZE);
            moved = true;
        }

        // Update last move time if player moved
        if (moved) {
            this.lastMoveTime = time;
        }

        // Update background tile position to follow camera
        if (this.backgroundTiles) {
            this.backgroundTiles.tilePositionX = this.cameras.main.scrollX;
            this.backgroundTiles.tilePositionY = this.cameras.main.scrollY;
        }
    }

    // Handle dropped elements from the sidebar
    handleDroppedElement(element: MapElement, worldX: number, worldY: number) {
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(worldX / this.CELL_SIZE);
        const gridY = Math.floor(worldY / this.CELL_SIZE);

        // Check if position is occupied
        if (this.isPositionOccupied(gridX, gridY)) return;

        // Add the object to the grid
        this.addObjectToGrid(
            gridX,
            gridY,
            element.type,
            0xffffff,  // White color for default objects
            element.size.width,
            element.size.height
        );
    }

    // Handle pointer down events
    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        // Convert to grid coordinates using world coordinates
        const gridX = Math.floor(pointer.worldX / this.CELL_SIZE);
        const gridY = Math.floor(pointer.worldY / this.CELL_SIZE);
        
        // Find clicked object
        const clickedObject = this.getObjectAt(gridX, gridY);
        
        if (clickedObject) {
            if (pointer.rightButtonDown()) {
                // Right click to deselect
                this.deselectObject();
            } else {
                // Left click to select and start drag
                this.selectObject(clickedObject);
                this.isDragging = true;
                this.dragStartX = pointer.worldX;
                this.dragStartY = pointer.worldY;
            }
        } else {
            this.deselectObject();
        }
    }

    // Handle pointer move events
    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (!this.isDragging || !this.selectedObject) return;

        // Calculate grid position using world coordinates
        const gridX = Math.floor(pointer.worldX / this.CELL_SIZE);
        const gridY = Math.floor(pointer.worldY / this.CELL_SIZE);
        
        // Update sprite position immediately for smooth movement
        const newX = gridX * this.CELL_SIZE + (this.selectedObject.width * this.CELL_SIZE) / 2;
        const newY = gridY * this.CELL_SIZE + (this.selectedObject.height * this.CELL_SIZE) / 2;
        
        if (this.selectedObject.sprite instanceof Phaser.GameObjects.Image || 
            this.selectedObject.sprite instanceof Phaser.GameObjects.Rectangle) {
            this.selectedObject.sprite.setPosition(newX, newY);
        }
        
        // Check if new position is valid and different
        if (!this.isPositionOccupied(gridX, gridY, this.selectedObject) && 
            (gridX !== this.selectedObject.x || gridY !== this.selectedObject.y)) {
            this.moveObjectToGrid(this.selectedObject, gridX, gridY);
        }
    }

    // Handle pointer up events
    private handlePointerUp() {
        this.isDragging = false;
    }

    // Select an object
    private selectObject(object: GridObject) {
        this.deselectObject();
        this.selectedObject = object;
        
        // Add visual feedback for selected object
        if (object.sprite instanceof Phaser.GameObjects.Image) {
            object.sprite.setTint(0xffff00);  // Yellow tint
        } else if (object.sprite instanceof Phaser.GameObjects.Rectangle) {
            object.sprite.setStrokeStyle(2, 0xffff00);  // Yellow border
        }
    }

    // Deselect the currently selected object
    private deselectObject() {
        if (this.selectedObject) {
            // Remove visual feedback
            if (this.selectedObject.sprite instanceof Phaser.GameObjects.Image) {
                this.selectedObject.sprite.clearTint();
            } else if (this.selectedObject.sprite instanceof Phaser.GameObjects.Rectangle) {
                this.selectedObject.sprite.setStrokeStyle(0);
            }
            this.selectedObject = null;
        }
    }

    // Move an object to a new grid position
    private moveObjectToGrid(object: GridObject, newGridX: number, newGridY: number) {
        // Remove from old position
        const index = this.gridObjects.indexOf(object);
        if (index > -1) {
            this.gridObjects.splice(index, 1);
        }

        // Update object position
        object.x = newGridX;
        object.y = newGridY;

        // Convert grid coordinates to pixel coordinates
        const x = newGridX * this.CELL_SIZE + (object.width * this.CELL_SIZE) / 2;
        const y = newGridY * this.CELL_SIZE + (object.height * this.CELL_SIZE) / 2;

        // Update sprite position
        if (object.sprite instanceof Phaser.GameObjects.Image || 
            object.sprite instanceof Phaser.GameObjects.Rectangle) {
            object.sprite.setPosition(x, y);
        }

        // Add back to grid objects
        this.gridObjects.push(object);
    }

    // Delete the currently selected object
    private deleteSelectedObject() {
        if (this.selectedObject) {
            // Remove from grid objects array
            const index = this.gridObjects.indexOf(this.selectedObject);
            if (index > -1) {
                this.gridObjects.splice(index, 1);
            }

            // Destroy the sprite
            this.selectedObject.sprite.destroy();

            // Clear selection
            this.selectedObject = null;
        }
    }

    // Public method to delete selected object
    deleteSelected() {
        this.deleteSelectedObject();
    }
}

// React component that wraps the Phaser game
const GameArena = forwardRef<{ handleDeleteSelected?: () => void }>((props, ref) => {
    // Reference to the Phaser game instance
    const gameRef = useRef<Phaser.Game | null>(null);
    // Reference to the main scene
    const sceneRef = useRef<MainScene | null>(null);

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
        handleDeleteSelected: () => {
            if (sceneRef.current) {
                sceneRef.current.deleteSelected();
            }
        }
    }));

    // Initialize the game when component mounts
    useEffect(() => {
        if (gameRef.current) return;

        // Game configuration
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,  // Automatically choose WebGL or Canvas
            parent: 'game-container',  // DOM element to mount the game
            width: '100%',  // Use full width of container
            height: '100%',  // Use full height of container
            scene: MainScene,  // Use our MainScene class
            backgroundColor: '#000000',  // Black background
            scale: {
                mode: Phaser.Scale.RESIZE,  // Resize game to fit container
                autoCenter: Phaser.Scale.CENTER_BOTH  // Center the game
            }
        };

        // Create the game instance
        gameRef.current = new Phaser.Game(config);
        
        // Get scene reference after a short delay to ensure it's initialized
        setTimeout(() => {
            sceneRef.current = gameRef.current?.scene.getScene('MainScene') as MainScene;
        }, 1000);

        // Cleanup when component unmounts
        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
                sceneRef.current = null;
            }
        };
    }, []);

    // Handle drag over events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Handle drop events from the sidebar
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const element = JSON.parse(e.dataTransfer.getData('application/json')) as MapElement;
        
        // Get fresh scene reference
        const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
        if (!scene) return;

        // Get the game container's position and size
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        const rect = gameContainer.getBoundingClientRect();
        
        // Calculate position relative to the game container
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Get the camera's viewport
        const camera = scene.cameras.main;
        
        // Convert screen coordinates to world coordinates
        const worldPoint = camera.getWorldPoint(x, y);
        
        scene.handleDroppedElement(element, worldPoint.x, worldPoint.y);
    };

    // Render the game container
    return (
        <div 
            id="game-container" 
            className="w-full h-full"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        />
    );
});

// Set display name for the component
GameArena.displayName = 'GameArena';

export default GameArena;