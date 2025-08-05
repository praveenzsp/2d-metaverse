/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as Phaser from 'phaser';
import axios from '@/lib/axios';
import { isAxiosError } from 'axios';

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
    id: string;
    name: string;
    imageUrl: string;
    type: string;
    width: number;
    height: number;
    static: boolean;
}

// Define the structure for map elements from the API
interface MapElementData {
    id: string;
    x: number;
    y: number;
    element: {
        name: string;
        imageUrl: string;
        width: number;
        height: number;
        static: boolean;
    };
}

interface MapData {
    id: string;
    name: string;
    thumbnail: string;
    dimensions: string;
    elements: MapElementData[];
}

// Main game scene class that handles all game logic and rendering
class MainScene extends Phaser.Scene {
    // Player object that can be moved around the grid
    private player!: Phaser.GameObjects.Rectangle;
    
    // Keyboard input handler for player movement
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Constants for grid and game settings
    private readonly CELL_SIZE = 50;        // Size of each grid cell in pixels
    private gridWidth = 0;                  // Width of the grid in cells
    private gridHeight = 0;                 // Height of the grid in cells
    private readonly PLAYER_SIZE = 50;      // Size of the player in pixels
    private canMove = true;                 // Flag to control player movement
    private gridObjects: GridObject[] = []; // Array to store all objects on the grid
    private isPlayerMoving = false;         // Flag to track if player is moving
    
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
    private mapId: string = '';
    private path: { x: number, y: number }[] = [];  // Store the current path
    private isMovingAlongPath = false;  // Flag to track if player is moving along path
    private readonly MOVE_SPEED = 200;  // Pixels per second
    private lastClickTime = 0;
    private readonly DOUBLE_CLICK_DELAY = 300; // milliseconds
    private isDoubleClicking = false;  // Flag to track double-click state

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

        // Wait for all assets to load
        return new Promise<void>((resolve) => {
            this.load.on('complete', () => {
                resolve();
            });
            this.load.start();
        });
    }

    // Initialize the game scene
    async create() {
        console.log('Starting create method');
        
        // Load the tile image if not already loaded
        if (!this.textures.exists('gridTile')) {
            console.log('Loading tile image');
            this.load.image('gridTile', '/tile.png');
            await new Promise<void>((resolve) => {
                this.load.once('complete', () => {
                    console.log('Tile image loaded successfully');
                    resolve();
                });
                this.load.start();
            });
        } else {
            console.log('Tile image already loaded');
        }

        // Create the grid lines
        this.createGrid();

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

        // Add camera drag functionality
        let isDragging = false;
        let lastPointerX = 0;
        let lastPointerY = 0;
        let dragStartTime = 0;

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Only start dragging if no element is selected and left click
            if (pointer.leftButtonDown() && !this.selectedObject) {
                isDragging = true;
                lastPointerX = pointer.x;
                lastPointerY = pointer.y;
                dragStartTime = Date.now();
                
                // Stop following player while dragging
                this.cameras.main.stopFollow();
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (isDragging && !this.selectedObject) {
                // Calculate the movement delta
                const dx = (lastPointerX - pointer.x) / this.cameras.main.zoom;
                const dy = (lastPointerY - pointer.y) / this.cameras.main.zoom;
                
                // Update camera position
                this.cameras.main.scrollX += dx;
                this.cameras.main.scrollY += dy;
                
                // Update last position
                lastPointerX = pointer.x;
                lastPointerY = pointer.y;
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            // Only stop dragging if it was a drag operation (not a click)
            if (isDragging && Date.now() - dragStartTime > 100) {
                isDragging = false;
                
                // Only resume following if player is moving
                if (this.isPlayerMoving) {
                    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                }
            }
        });

        this.input.on('pointerout', () => {
            if (isDragging) {
                isDragging = false;
                
                // Only resume following if player is moving
                if (this.isPlayerMoving) {
                    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                }
            }
        });

        // Set up input handlers for element interaction
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.input.on('pointerout', this.handlePointerUp, this);

        // Load existing map elements if mapId is set
        if (this.mapId) {
            await this.loadMapElements();
            // Create tiles after map data is loaded
            this.createTiles();
            
            // Find a safe position to spawn the player after loading all elements
            console.log('Finding safe spawn position...');
            const safePosition = this.findSafeSpawnPosition();
            console.log('Safe spawn position found:', safePosition);

            // Create the player as a green rectangle
            this.player = this.add.rectangle(
                safePosition.x,
                safePosition.y,
                this.PLAYER_SIZE * 0.8,
                this.PLAYER_SIZE * 0.8,
                0x00ff00  // Green color
            );
            this.player.setStrokeStyle(2, 0xffffff)  // Add white border
                .setDepth(2);  // Set depth to 2 for player (above tiles and elements)

            // Set up the camera bounds and initial position
            this.cameras.main.setBounds(0, 0, this.gridWidth * this.CELL_SIZE, this.gridHeight * this.CELL_SIZE);
            this.cameras.main.setZoom(1);
            this.cameras.main.centerOn(this.player.x, this.player.y);
        }

        // Make all existing sprites interactive
        this.gridObjects.forEach(obj => {
            if (obj.sprite instanceof Phaser.GameObjects.Image || 
                obj.sprite instanceof Phaser.GameObjects.Rectangle) {
                obj.sprite.setInteractive();
            }
        });
    }

    // Create the background tiles
    private createTiles() {
        console.log('Creating tiles with dimensions:', this.gridWidth, this.gridHeight);
        
        // Destroy existing tiles if they exist
        if (this.backgroundTiles) {
            this.backgroundTiles.destroy();
        }

        // Create individual tiles for each cell
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                const tileX = x * this.CELL_SIZE;
                const tileY = y * this.CELL_SIZE;
                const tile = this.add.image(tileX, tileY, 'gridTile');
                tile.setOrigin(0, 0);
                tile.setDisplaySize(this.CELL_SIZE, this.CELL_SIZE);
                tile.setDepth(0);
                tile.setAlpha(1); // Ensure tile is fully visible
            }
        }
        console.log('Created individual tiles for each cell');

        // Update camera bounds with new dimensions
        const totalWidth = this.gridWidth * this.CELL_SIZE;
        const totalHeight = this.gridHeight * this.CELL_SIZE;
        this.cameras.main.setBounds(0, 0, totalWidth, totalHeight);
    }

    // Load map elements from the backend
    private async loadMapElements() {
        try {
            if (!this.mapId) {
                console.error('No mapId available');
                return;
            }

            const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/maps/get-map-elements?mapId=${this.mapId}`;
            const response = await axios.get(url);
            
            if (!response.data.map) {
                console.error('No map data found');
                return;
            }

            const map = response.data.map;
            
            // Set grid dimensions from map data
            const [width, height] = map.dimensions.split('x').map(Number);
            this.gridWidth = width;
            this.gridHeight = height;
            console.log('Set grid dimensions:', this.gridWidth, this.gridHeight);
            
            if (map && map.elements && map.elements.length > 0) {
                // Load each element's image first
                const loadPromises = map.elements.map(async (element: MapElementData) => {
                    const imageKey = `element_${element.id}`;
                    if (!this.textures.exists(imageKey)) {
                        return new Promise((resolve) => {
                            this.load.image(imageKey, element.element.imageUrl);
                            this.load.once('complete', () => {
                                resolve(null);
                            });
                            this.load.start();
                        });
                    } else {
                        return Promise.resolve(null);
                    }
                });
                
                // Wait for all images to load
                await Promise.all(loadPromises);
                
                // Add elements to the grid
                map.elements.forEach((element: MapElementData) => {
                    this.addObjectToGrid(
                        element.x,
                        element.y,
                        `element_${element.id}`,
                        0xffffff,
                        element.element.width,
                        element.element.height
                    );
                });
            }
        } catch (error) {
            console.error('Error loading map elements:', error);
            if (isAxiosError(error)) {
                console.error('Response data:', error.response?.data);
                console.error('Response status:', error.response?.status);
            }
        }
    }

    // Add a new object to the grid at specified coordinates
    private addObjectToGrid(gridX: number, gridY: number, type: string, color: number, width: number = 1, height: number = 1) {
        try {
            // Convert grid coordinates to pixel coordinates
            const x = gridX * this.CELL_SIZE + (width * this.CELL_SIZE) / 2;
            const y = gridY * this.CELL_SIZE + (height * this.CELL_SIZE) / 2;

            let sprite: Phaser.GameObjects.GameObject;

            // Check if the type is an image key (starts with 'element_')
            if (type.startsWith('element_')) {
                sprite = this.add.image(x, y, type)
                    .setDisplaySize(width * this.CELL_SIZE, height * this.CELL_SIZE)
                    .setOrigin(0.5)
                    .setInteractive({ draggable: true })
                    .setDepth(1);  // Set depth to 1 for elements (above tiles, below player)
            } else {
                // Create different types of objects based on the type parameter
                switch (type) {
                    case 'work_desk':
                        sprite = this.add.image(x, y, 'work_desk')
                            .setDisplaySize(width * this.CELL_SIZE, height * this.CELL_SIZE)
                            .setOrigin(0.5)
                            .setInteractive({ draggable: true })
                            .setDepth(1);  // Set depth to 1 for elements
                        break;
                    case 'tree':
                        // Create a tree using graphics
                        const treeGraphics = this.add.graphics();
                        treeGraphics.fillStyle(0x228B22, 1);  // Dark green color
                        treeGraphics.fillCircle(x, y - 10, 15);  // Tree top
                        treeGraphics.fillStyle(0x8B4513, 1);  // Brown color
                        treeGraphics.fillRect(x - 5, y, 10, 20);  // Tree trunk
                        sprite = treeGraphics;
                        (sprite as Phaser.GameObjects.Container).setDepth(1);  // Set depth to 1 for elements
                        break;
                    case 'rock':
                        // Create a rock using graphics
                        const rockGraphics = this.add.graphics();
                        rockGraphics.fillStyle(0x808080, 1);  // Gray color
                        rockGraphics.fillCircle(x, y, 20 * Math.max(width, height));  // Rock body
                        rockGraphics.fillStyle(0x696969, 1);  // Darker gray
                        rockGraphics.fillCircle(x - 5, y - 5, 5 * Math.max(width, height));  // Rock detail
                        sprite = rockGraphics;
                        (sprite as Phaser.GameObjects.Container).setDepth(1);  // Set depth to 1 for elements
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
                        (sprite as Phaser.GameObjects.Container).setDepth(1);  // Set depth to 1 for elements
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
                        (sprite as Phaser.GameObjects.Container).setDepth(1);  // Set depth to 1 for elements
                        break;
                    default:
                        // Create a default rectangle for unknown types
                        sprite = this.add.rectangle(
                            x,
                            y,
                            this.CELL_SIZE * width * 0.8,
                            this.CELL_SIZE * height * 0.8,
                            color
                        ).setInteractive({ draggable: true })
                        .setDepth(1);  // Set depth to 1 for elements
                }
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
            this.gridWidth * this.CELL_SIZE - this.PLAYER_SIZE / 2
        );
        const newY = Phaser.Math.Clamp(
            this.player.y + dy,
            this.PLAYER_SIZE / 2,
            this.gridHeight * this.CELL_SIZE - this.PLAYER_SIZE / 2
        );

        // Move player to new position
        this.player.x = newX;
        this.player.y = newY;

        // Set player as moving and start following
        this.isPlayerMoving = true;
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Re-enable movement after delay
        this.time.delayedCall(100, () => {
            this.canMove = true;
        });
    }

    // Create the grid lines
    private createGrid() {
        const graphics = this.add.graphics();
        graphics.setDepth(3);  // Set depth to 3 for grid lines (above everything)
        
        // Draw minor grid lines (thinner, more frequent)
        graphics.lineStyle(1, 0xffffff, 0.05);
        for (let x = 0; x <= this.gridWidth * this.CELL_SIZE; x += this.CELL_SIZE) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.gridHeight * this.CELL_SIZE);
        }
        for (let y = 0; y <= this.gridHeight * this.CELL_SIZE; y += this.CELL_SIZE) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.gridWidth * this.CELL_SIZE, y);
        }

        // Draw major grid lines (thicker, less frequent)
        graphics.lineStyle(1, 0xffffff, 0.1);
        for (let x = 0; x <= this.gridWidth * this.CELL_SIZE; x += this.CELL_SIZE * 4) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.gridHeight * this.CELL_SIZE);
        }
        for (let y = 0; y <= this.gridHeight * this.CELL_SIZE; y += this.CELL_SIZE * 4) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.gridWidth * this.CELL_SIZE, y);
        }

        graphics.strokePath();
    }

    // Main game update loop
    update(time: number) {
        if (this.isMovingAlongPath) {
            this.moveAlongPath();
            return;
        }

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
    handleDroppedElement(element: MapElement | MapElementData, worldX: number, worldY: number) {
        // console.log('Dropped element:', element);
        
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(worldX / this.CELL_SIZE);
        const gridY = Math.floor(worldY / this.CELL_SIZE);

        // Check if position is occupied
        if (this.isPositionOccupied(gridX, gridY)) return;

        // Get the correct image URL and dimensions based on element structure
        const imageUrl = 'element' in element ? element.element.imageUrl : element.imageUrl;
        const width = 'element' in element ? element.element.width : element.width;
        const height = 'element' in element ? element.element.height : element.height;
        const elementId = 'element' in element ? element.id : element.id;

        if (!imageUrl || !width || !height || !elementId) {
            // console.error('Invalid element data:', element);
            return;
        }

        // Load the element's image if not already loaded
        const imageKey = `element_${elementId}`;
        // console.log('Loading image with key:', imageKey, 'from URL:', imageUrl);
        
        if (!this.textures.exists(imageKey)) {
            this.load.image(imageKey, imageUrl);
            this.load.once('complete', () => {
                // console.log('Image loaded successfully:', imageKey);
                this.addObjectToGrid(
                    gridX,
                    gridY,
                    imageKey,
                    0xffffff,
                    width,
                    height
                );
                // Save element position after adding to grid
                this.saveElementPosition(elementId, gridX, gridY);
            });
            this.load.start();
        } else {
            // console.log('Image already loaded:', imageKey);
            // If image is already loaded, add object immediately
        this.addObjectToGrid(
            gridX,
            gridY,
                imageKey,
                0xffffff,
                width,
                height
            );
            // Save element position after adding to grid
            this.saveElementPosition(elementId, gridX, gridY);
        }
    }

    // Save element position to the backend
    private async saveElementPosition(elementId: string, x: number, y: number) {
        try {
            // console.log('Saving element position:', { elementId, x, y, mapId: this.mapId });
            
            if (!this.mapId) {
                // console.error('Cannot save element position: mapId is not set');
                return;
            }

            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/add-map-element`, {
                elementId,
                x,
                y,
                mapId: this.mapId
            });
            // console.log('Element position saved:', response.data);
        } catch (error) {
            console.error('Error saving element position:', error);
            if (isAxiosError(error)) {
                console.error('Response data:', error.response?.data);
                console.error('Response status:', error.response?.status);
            }
        }
    }

    // Handle pointer down events
    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        // Convert to grid coordinates using world coordinates
        const gridX = Math.floor(pointer.worldX / this.CELL_SIZE);
        const gridY = Math.floor(pointer.worldY / this.CELL_SIZE);
        
        // Check for double click first
        const currentTime = Date.now();
        const isDoubleClick = (currentTime - this.lastClickTime) < this.DOUBLE_CLICK_DELAY;
        this.lastClickTime = currentTime;

        if (isDoubleClick) {
            // Handle double click for pathfinding
            const startX = Math.floor(this.player.x / this.CELL_SIZE);
            const startY = Math.floor(this.player.y / this.CELL_SIZE);
            
            // Find path to clicked position
            this.path = this.findPath(startX, startY, gridX, gridY);
            
            if (this.path.length > 0) {
                this.isMovingAlongPath = true;
                this.isPlayerMoving = true;
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            }
            return; // Exit early to prevent any drag initialization
        }
        
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
        if (!this.isDragging || !this.selectedObject || this.isMovingAlongPath || this.isDoubleClicking) return;

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
        this.isDoubleClicking = false;  // Reset double-click flag
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
    private async moveObjectToGrid(object: GridObject, newGridX: number, newGridY: number) {
        // Update UI immediately
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

        // Update database in background
        try {
            // Get the element ID from the sprite's texture key
            const elementId = object.type.replace('element_', '');
            
            // Update position in the database
            await axios.put(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/update-map-element`, {
                mapId: this.mapId,
                elementId,
                x: newGridX,
                y: newGridY
            });
        } catch (error) {
            console.error('Error updating element position:', error);
            if (isAxiosError(error)) {
                console.error('Response data:', error.response?.data);
                console.error('Response status:', error.response?.status);
            }
        }
    }

    // Delete the currently selected object
    private async deleteSelectedObject() {
        if (this.selectedObject) {
            try {
                // Get the element ID from the sprite's texture key
                const elementId = this.selectedObject.type.replace('element_', '');
                
                // Call the delete endpoint
                await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/delete-map-element`, {
                    data: {
                        mapId: this.mapId,
                        elementId
                    }
                });

            // Remove from grid objects array
            const index = this.gridObjects.indexOf(this.selectedObject);
            if (index > -1) {
                this.gridObjects.splice(index, 1);
            }

            // Destroy the sprite
            this.selectedObject.sprite.destroy();

            // Clear selection
            this.selectedObject = null;

                console.log('Element deleted successfully');
            } catch (error) {
                console.error('Error deleting element:', error);
            }
        }
    }

    // Public method to delete selected object
    deleteSelected() {
        this.deleteSelectedObject();
    }

    setMapId(id: string) {
        // console.log('Setting mapId in scene:', id);
        this.mapId = id;
        // If scene is already created, load elements
        if (this.scene.isActive()) {
            // console.log('Scene is active, loading elements');
            this.loadMapElements();
        }
    }

    // Find a safe position to spawn the player where there are no obstacles
    private findSafeSpawnPosition(): { x: number, y: number } {
        console.log('Finding safe spawn position with grid dimensions:', this.gridWidth, this.gridHeight);
        console.log('Current grid objects:', this.gridObjects.length);
        
        // Create an array of all possible positions
        const possiblePositions: { x: number, y: number }[] = [];
        
        // Add all grid positions to the array
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                // Check if this position is safe (no obstacles)
                const isSafe = !this.gridObjects.some(obj => 
                    x >= obj.x && x < obj.x + obj.width &&
                    y >= obj.y && y < obj.y + obj.height
                );
                
                if (isSafe) {
                    possiblePositions.push({ x, y });
                }
            }
        }
        
        console.log('Found possible safe positions:', possiblePositions.length);
        
        // If we found safe positions, pick one randomly
        if (possiblePositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * possiblePositions.length);
            const safePos = possiblePositions[randomIndex];
            console.log('Selected random safe position:', safePos);
            
            // Convert grid coordinates to pixel coordinates
            return {
                x: safePos.x * this.CELL_SIZE + (this.CELL_SIZE / 2),
                y: safePos.y * this.CELL_SIZE + (this.CELL_SIZE / 2)
            };
        }
        
        // Fallback to center if no safe spot found
        const centerX = Math.floor(this.gridWidth / 2);
        const centerY = Math.floor(this.gridHeight / 2);
        console.log('No safe positions found, using center:', { centerX, centerY });
        return {
            x: centerX * this.CELL_SIZE + (this.CELL_SIZE / 2),
            y: centerY * this.CELL_SIZE + (this.CELL_SIZE / 2)
        };
    }

    // Find path between two points using A* algorithm
    private findPath(startX: number, startY: number, endX: number, endY: number): { x: number, y: number }[] {
        type PathNode = {
            x: number;
            y: number;
            f: number;
            g: number;
            h: number;
            parent: PathNode | null;
        };

        const openSet: PathNode[] = [];
        const closedSet: Set<string> = new Set();
        const startNode: PathNode = { x: startX, y: startY, f: 0, g: 0, h: 0, parent: null };
        
        openSet.push(startNode);
        
        while (openSet.length > 0) {
            // Find node with lowest f score
            let currentIndex = 0;
            for (let i = 0; i < openSet.length; i++) {
                if (openSet[i].f < openSet[currentIndex].f) {
                    currentIndex = i;
                }
            }
            
            const current = openSet[currentIndex];
            
            // If we reached the end, reconstruct and return the path
            if (current.x === endX && current.y === endY) {
                const path: { x: number, y: number }[] = [];
                let temp = current;
                while (temp.parent) {
                    path.push({ x: temp.x, y: temp.y });
                    temp = temp.parent;
                }
                return path.reverse();
            }
            
            // Remove current from openSet and add to closedSet
            openSet.splice(currentIndex, 1);
            closedSet.add(`${current.x},${current.y}`);
            
            // Check all adjacent cells
            const directions = [
                { x: 0, y: -1 },  // up
                { x: 1, y: 0 },   // right
                { x: 0, y: 1 },   // down
                { x: -1, y: 0 }   // left
            ];
            
            for (const dir of directions) {
                const neighborX = current.x + dir.x;
                const neighborY = current.y + dir.y;
                
                // Skip if out of bounds or in closed set
                if (neighborX < 0 || neighborX >= this.gridWidth || 
                    neighborY < 0 || neighborY >= this.gridHeight ||
                    closedSet.has(`${neighborX},${neighborY}`)) {
                    continue;
                }
                
                // Skip if position is occupied
                if (this.isPositionOccupied(neighborX, neighborY)) {
                    continue;
                }
                
                const gScore = current.g + 1;
                const hScore = Math.abs(neighborX - endX) + Math.abs(neighborY - endY);
                const fScore = gScore + hScore;
                
                // Check if this path to neighbor is better
                const existingNode = openSet.find(n => n.x === neighborX && n.y === neighborY);
                if (!existingNode || gScore < existingNode.g) {
                    const neighbor = {
                        x: neighborX,
                        y: neighborY,
                        f: fScore,
                        g: gScore,
                        h: hScore,
                        parent: current
                    };
                    
                    if (!existingNode) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        return [];  // No path found
    }

    // Move player along path
    private moveAlongPath() {
        if (this.path.length === 0) {
            this.isMovingAlongPath = false;
            this.isPlayerMoving = false;
            this.cameras.main.stopFollow();  // Stop following when path is complete
            return;
        }

        const target = this.path[0];
        const targetX = target.x * this.CELL_SIZE + this.CELL_SIZE / 2;
        const targetY = target.y * this.CELL_SIZE + this.CELL_SIZE / 2;
        
        // Calculate direction to move
        const dx = targetX - this.player.x;
        const dy = targetY - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {  // If we're close enough to the target
            this.path.shift();  // Remove the current target
            if (this.path.length === 0) {
                this.isMovingAlongPath = false;
                this.isPlayerMoving = false;
                this.cameras.main.stopFollow();  // Stop following when path is complete
            }
            return;
        }
        
        // Move towards target
        const speed = this.MOVE_SPEED * (1 / this.cameras.main.zoom);
        this.player.x += (dx / distance) * speed * (1/60);
        this.player.y += (dy / distance) * speed * (1/60);
    }
}

// React component that wraps the Phaser game
const GameArena = forwardRef<{ handleDeleteSelected?: () => void }, { mapId: string }>((props, ref) => {
    const { mapId } = props;
    console.log('GameArena props:', props);
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

        console.log('Initializing game with mapId:', props.mapId);

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

        console.log('Creating game instance with config:', config);
        // Create the game instance
        gameRef.current = new Phaser.Game(config);
        
        // Wait for the scene to be ready
        gameRef.current.events.once('ready', () => {
            const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
            if (scene) {
                console.log('Setting initial mapId in scene:', props.mapId);
                scene.setMapId(props.mapId);
                sceneRef.current = scene;
            }
        });

        // Cleanup when component unmounts
        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
                sceneRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Remove props.mapId from dependencies to prevent recreation

    // Update mapId when it changes
    useEffect(() => {
        if (sceneRef.current) {
            console.log('Updating mapId in scene:', props.mapId);
            sceneRef.current.setMapId(props.mapId);
            console.log('Scene:', sceneRef.current);
        }
    }, [props.mapId]);

    // Handle drag over events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Handle drop events from the sidebar
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const element = JSON.parse(e.dataTransfer.getData('application/json')) as MapElementData;
        
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