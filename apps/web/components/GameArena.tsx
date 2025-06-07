import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';

interface GridObject {
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    sprite: Phaser.GameObjects.GameObject;
}

interface MapElement {
    id: string;
    name: string;
    imageUrl: string;
    type: string;
    size: {
        width: number;
        height: number;
    };
}

class MainScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private readonly CELL_SIZE = 50;
    private readonly GRID_SIZE = 4000;
    private readonly PLAYER_SIZE = 50;
    private canMove = true;
    private gridObjects: GridObject[] = [];
    private readonly MIN_ZOOM = 0.5;
    private readonly MAX_ZOOM = 1.3;
    private readonly ZOOM_STEP = 0.01;
    private readonly MOVE_DELAY = 150; // Delay between moves in milliseconds
    private lastMoveTime = 0;
    private backgroundTiles!: Phaser.GameObjects.TileSprite;
    private selectedObject: GridObject | null = null;
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Load the background tile image
        this.load.image('gridTile', '/tile.png');
        // Load element images
        this.load.image('work_desk', '/elements/work_desk.png');
    }

    private findSafeSpawnPosition(): { x: number, y: number } {
        const numCells = this.GRID_SIZE / this.CELL_SIZE;
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
                        return {
                            x: x * this.CELL_SIZE + (this.CELL_SIZE / 2),
                            y: y * this.CELL_SIZE + (this.CELL_SIZE / 2)
                        };
                    }
                }
            }
        }
        
        // Fallback to center if no safe spot found (shouldn't happen)
        return {
            x: centerCell * this.CELL_SIZE + (this.CELL_SIZE / 2),
            y: centerCell * this.CELL_SIZE + (this.CELL_SIZE / 2)
        };
    }

    create() {
        // Create individual tiles for each cell
        const numCells = this.GRID_SIZE / this.CELL_SIZE;
        for (let x = 0; x < numCells; x++) {
            for (let y = 0; y < numCells; y++) {
                const tileX = x * this.CELL_SIZE;
                const tileY = y * this.CELL_SIZE;
                this.add.image(tileX, tileY, 'gridTile')
                    .setOrigin(0, 0)
                    .setDisplaySize(this.CELL_SIZE, this.CELL_SIZE);
            }
        }

        // Create grid lines on top of the background
        this.createGrid();

        // Find a safe spawn position
        const safePosition = this.findSafeSpawnPosition();

        // Create player at safe position
        this.player = this.add.rectangle(
            safePosition.x,
            safePosition.y,
            this.PLAYER_SIZE * 0.8,
            this.PLAYER_SIZE * 0.8,
            0x00ff00
        );
        this.player.setStrokeStyle(2, 0xffffff);

        // Set up camera to follow player
        this.cameras.main.setBounds(0, 0, this.GRID_SIZE, this.GRID_SIZE);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);
        
        // Center the camera on the player initially
        this.cameras.main.centerOn(this.player.x, this.player.y);

        // Set up input
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Add mouse wheel zoom
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
            const currentZoom = this.cameras.main.zoom;
            const zoomDelta = deltaY > 0 ? -this.ZOOM_STEP : this.ZOOM_STEP;
            const newZoom = Phaser.Math.Clamp(currentZoom + zoomDelta, this.MIN_ZOOM, this.MAX_ZOOM);
            
            // Get mouse position in world coordinates
            const mouseWorldX = this.cameras.main.scrollX + pointer.x / currentZoom;
            const mouseWorldY = this.cameras.main.scrollY + pointer.y / currentZoom;
            
            // Set new zoom
            this.cameras.main.setZoom(newZoom);
            
            // Adjust camera position to zoom towards mouse
            const newMouseWorldX = this.cameras.main.scrollX + pointer.x / newZoom;
            const newMouseWorldY = this.cameras.main.scrollY + pointer.y / newZoom;
            
            this.cameras.main.scrollX += (mouseWorldX - newMouseWorldX);
            this.cameras.main.scrollY += (mouseWorldY - newMouseWorldY);
        });

        // Add input handlers for element interaction
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.input.on('pointerout', this.handlePointerUp, this);

        // Make all sprites interactive
        this.gridObjects.forEach(obj => {
            if (obj.sprite instanceof Phaser.GameObjects.Image || 
                obj.sprite instanceof Phaser.GameObjects.Rectangle) {
                obj.sprite.setInteractive();
            }
        });

        console.log('Scene created successfully');
    }

    private addObjectToGrid(gridX: number, gridY: number, type: string, color: number, width: number = 1, height: number = 1) {
        try {
            // Convert grid coordinates to pixel coordinates
            const x = gridX * this.CELL_SIZE + (width * this.CELL_SIZE) / 2;
            const y = gridY * this.CELL_SIZE + (height * this.CELL_SIZE) / 2;

            let sprite: Phaser.GameObjects.GameObject;

            switch (type) {
                case 'work_desk':
                    sprite = this.add.image(x, y, 'work_desk')
                        .setDisplaySize(width * this.CELL_SIZE, height * this.CELL_SIZE)
                        .setOrigin(0.5)
                        .setInteractive({ draggable: true });
                    break;
                case 'tree':
                    // Create a tree-like shape
                    const treeGraphics = this.add.graphics();
                    treeGraphics.fillStyle(0x228B22, 1); // Dark green
                    treeGraphics.fillCircle(x, y - 10, 15); // Tree top
                    treeGraphics.fillStyle(0x8B4513, 1); // Brown
                    treeGraphics.fillRect(x - 5, y, 10, 20); // Tree trunk
                    sprite = treeGraphics;
                    break;
                case 'rock':
                    // Create a rock-like shape
                    const rockGraphics = this.add.graphics();
                    rockGraphics.fillStyle(0x808080, 1); // Gray
                    rockGraphics.fillCircle(x, y, 20 * Math.max(width, height)); // Scaled rock body
                    rockGraphics.fillStyle(0x696969, 1); // Darker gray
                    rockGraphics.fillCircle(x - 5, y - 5, 5 * Math.max(width, height)); // Scaled rock detail
                    sprite = rockGraphics;
                    break;
                case 'chest':
                    // Create a treasure chest
                    const chestGraphics = this.add.graphics();
                    chestGraphics.fillStyle(0x8B4513, 1); // Brown
                    chestGraphics.fillRect(x - 15, y - 10, 30, 20); // Chest body
                    chestGraphics.fillStyle(0xFFD700, 1); // Gold
                    chestGraphics.fillRect(x - 12, y - 8, 24, 4); // Chest lid
                    chestGraphics.fillRect(x - 8, y - 4, 16, 12); // Chest front
                    sprite = chestGraphics;
                    break;
                case 'house':
                    // Create a house
                    const houseGraphics = this.add.graphics();
                    // House body
                    houseGraphics.fillStyle(0x8B4513, 1); // Brown
                    houseGraphics.fillRect(x - (width * this.CELL_SIZE) / 2, y - (height * this.CELL_SIZE) / 2, 
                        width * this.CELL_SIZE, height * this.CELL_SIZE);
                    // Roof
                    houseGraphics.fillStyle(0x800000, 1); // Dark red
                    houseGraphics.fillTriangle(
                        x - (width * this.CELL_SIZE) / 2, y - (height * this.CELL_SIZE) / 2,
                        x + (width * this.CELL_SIZE) / 2, y - (height * this.CELL_SIZE) / 2,
                        x, y - (height * this.CELL_SIZE) / 2 - 20
                    );
                    // Door
                    houseGraphics.fillStyle(0x4B2F0F, 1); // Dark brown
                    houseGraphics.fillRect(x - 10, y, 20, 30);
                    sprite = houseGraphics;
                    break;
                default:
                    sprite = this.add.rectangle(
                        x,
                        y,
                        this.CELL_SIZE * width * 0.8,
                        this.CELL_SIZE * height * 0.8,
                        color
                    ).setInteractive({ draggable: true });
            }

            // Store the object
            const gridObject = {
                x: gridX,
                y: gridY,
                width,
                height,
                type,
                sprite
            };

            this.gridObjects.push(gridObject);

            // Add click handler to the sprite
            if (sprite instanceof Phaser.GameObjects.Image || 
                sprite instanceof Phaser.GameObjects.Rectangle) {
                sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    if (pointer.rightButtonDown()) {
                        this.deselectObject();
                    } else {
                        this.selectObject(gridObject);
                        this.isDragging = true;
                        this.dragStartX = this.cameras.main.scrollX + (pointer.x / this.cameras.main.zoom);
                        this.dragStartY = this.cameras.main.scrollY + (pointer.y / this.cameras.main.zoom);
                    }
                });

                // Add drag handlers
                sprite.on('drag', (pointer: Phaser.Input.Pointer) => {
                    if (this.isDragging && this.selectedObject) {
                        const worldX = this.cameras.main.scrollX + (pointer.x / this.cameras.main.zoom);
                        const worldY = this.cameras.main.scrollY + (pointer.y / this.cameras.main.zoom);
                        
                        const gridX = Math.floor(worldX / this.CELL_SIZE);
                        const gridY = Math.floor(worldY / this.CELL_SIZE);
                        
                        if (!this.isPositionOccupied(gridX, gridY, this.selectedObject) && 
                            (gridX !== this.selectedObject.x || gridY !== this.selectedObject.y)) {
                            this.moveObjectToGrid(this.selectedObject, gridX, gridY);
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error adding object to grid:', error);
        }
    }

    // Helper method to get object at grid coordinates
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

        // Calculate new pixel position
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

        // Move player
        this.player.x = newX;
        this.player.y = newY;

        // Update camera position to follow player
        this.cameras.main.centerOn(newX, newY);

        // Re-enable movement after a short delay
        this.time.delayedCall(100, () => {
            this.canMove = true;
        });
    }

    private createGrid() {
        const graphics = this.add.graphics();
        
        // Draw minor grid lines
        graphics.lineStyle(1, 0xffffff, 0.05);
        for (let x = 0; x <= this.GRID_SIZE; x += this.CELL_SIZE) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.GRID_SIZE);
        }
        for (let y = 0; y <= this.GRID_SIZE; y += this.CELL_SIZE) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.GRID_SIZE, y);
        }

        // Draw major grid lines
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

    update(time: number) {
        if (!this.canMove) return;

        // Check if enough time has passed since last move
        if (time - this.lastMoveTime < this.MOVE_DELAY) return;

        let moved = false;

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

    // Add method to handle dropped elements
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
            0xffffff,
            element.size.width,
            element.size.height
        );
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        // Convert pointer position to world coordinates
        const worldX = this.cameras.main.scrollX + (pointer.x / this.cameras.main.zoom);
        const worldY = this.cameras.main.scrollY + (pointer.y / this.cameras.main.zoom);
        
        // Convert to grid coordinates
        const gridX = Math.floor(worldX / this.CELL_SIZE);
        const gridY = Math.floor(worldY / this.CELL_SIZE);
        
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
                this.dragStartX = worldX;
                this.dragStartY = worldY;
            }
        } else {
            this.deselectObject();
        }
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (!this.isDragging || !this.selectedObject) return;

        // Convert pointer position to world coordinates
        const worldX = this.cameras.main.scrollX + (pointer.x / this.cameras.main.zoom);
        const worldY = this.cameras.main.scrollY + (pointer.y / this.cameras.main.zoom);
        
        // Calculate grid position
        const gridX = Math.floor(worldX / this.CELL_SIZE);
        const gridY = Math.floor(worldY / this.CELL_SIZE);
        
        // Check if new position is valid and different from current position
        if (!this.isPositionOccupied(gridX, gridY, this.selectedObject) && 
            (gridX !== this.selectedObject.x || gridY !== this.selectedObject.y)) {
            // Update object position
            this.moveObjectToGrid(this.selectedObject, gridX, gridY);
        }
    }

    private handlePointerUp() {
        this.isDragging = false;
    }

    private selectObject(object: GridObject) {
        this.deselectObject();
        this.selectedObject = object;
        
        // Add visual feedback for selected object
        if (object.sprite instanceof Phaser.GameObjects.Image) {
            object.sprite.setTint(0xffff00);
        } else if (object.sprite instanceof Phaser.GameObjects.Rectangle) {
            object.sprite.setStrokeStyle(2, 0xffff00);
        }
    }

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

    // Add method to expose delete functionality
    deleteSelected() {
        this.deleteSelectedObject();
    }
}

const GameArena = forwardRef<{ handleDeleteSelected?: () => void }>((props, ref) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<MainScene | null>(null);

    useImperativeHandle(ref, () => ({
        handleDeleteSelected: () => {
            if (sceneRef.current) {
                sceneRef.current.deleteSelected();
            }
        }
    }));

    useEffect(() => {
        if (gameRef.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: 'game-container',
            width: '100%',
            height: '100%',
            scene: MainScene,
            backgroundColor: '#000000',
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        gameRef.current = new Phaser.Game(config);
        
        // Get scene reference after a short delay to ensure it's initialized
        setTimeout(() => {
            sceneRef.current = gameRef.current?.scene.getScene('MainScene') as MainScene;
        }, 1000);

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
                sceneRef.current = null;
            }
        };
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const element = JSON.parse(e.dataTransfer.getData('application/json')) as MapElement;
        
        // Get fresh scene reference
        const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
        if (!scene) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        // First convert to world space considering zoom
        const worldX = x / scene.cameras.main.zoom;
        const worldY = y / scene.cameras.main.zoom;
        
        // Then add camera scroll to get final world position
        const finalWorldX = worldX + scene.cameras.main.scrollX;
        const finalWorldY = worldY + scene.cameras.main.scrollY;
        
        scene.handleDroppedElement(element, finalWorldX, finalWorldY);
    };

    return (
        <div 
            id="game-container" 
            className="w-full h-full"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        />
    );
});

GameArena.displayName = 'GameArena';

export default GameArena;