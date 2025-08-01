/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import Phaser from 'phaser';
import axios from '@/lib/axios';
import { isAxiosError } from 'axios';
import { useWebRTC, ProximityUser } from '@/hooks/useWebRTC';
import VideoBox from './VideoBox';
import { CallControls } from './CallControls';
import { motion } from 'motion/react';

// WebSocket message types
interface WebSocketMessage {
    type:
        | 'join'
        | 'move'
        | 'leave'
        | 'space-joined'
        | 'movement-rejected'
        | 'movement'
        | 'user-left'
        | 'user-join'
        | 'proximity-users'
        | 'proximity-call-created'
        | 'proximity-call-updated'
        | 'proximity-calls-merged'
        | 'user-left-proximity-call'
        | 'chat-message'
        | 'chat-messages';
    payload:
        | JoinPayload
        | MovePayload
        | LeavePayload
        | SpaceJoinedPayload
        | MovementPayload
        | UserLeftPayload
        | UserJoinPayload
        | ProximityUsersPayload
        | ProximityCallCreatedPayload
        | ProximityCallUpdatedPayload
        | ProximityCallsMergedPayload
        | UserLeftProximityCallPayload
        | ChatMessagePayload
        | ChatMessagesPayload;
}

interface JoinPayload {
    spaceId: string;
    token: string;
}

interface MovePayload {
    x: number;
    y: number;
}

interface LeavePayload {
    spaceId: string;
}

interface SpaceJoinedPayload {
    spawn: {
        x: number;
        y: number;
    };
    users: Array<{
        id: string;
        x: number;
        y: number;
    }>;
    userId: string;
}

interface MovementPayload {
    x: number;
    y: number;
    userId: string;
}

interface UserLeftPayload {
    userId: string;
}

interface UserJoinPayload {
    userId: string;
    x: number;
    y: number;
}

interface GridObject {
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    sprite: Phaser.GameObjects.GameObject;
}

interface SpaceElementData {
    id: string;
    x: number;
    y: number;
    element: {
        name: string;
        image: string;
        width: number;
        height: number;
        static: boolean;
    };
}

interface ProximityUsersPayload {
    users: ProximityUser[];
}

interface ProximityCallCreatedPayload {
    callId: string;
    participants: Array<{ userId: string; username: string }>;
}

interface ProximityCallUpdatedPayload {
    callId: string;
    participants: Array<{ userId: string; username: string }>;
}

interface ProximityCallsMergedPayload {
    callId: string;
    participants: Array<{ userId: string; username: string }>;
}

interface UserLeftProximityCallPayload {
    callId: string;
    leftUserId: string;
    remainingParticipants: Array<{ userId: string; username: string }>;
}

interface ChatMessagePayload {
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    message: string;
    timestamp: Date;
    spaceId: string;
}

interface ChatMessagesPayload {
    messages: ChatMessagePayload[];
}

// Main game scene class that handles all game logic and rendering
class MainScene extends Phaser.Scene {
    private ws: WebSocket | null = null;
    private otherPlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
    private playerUsernames: Map<string, Phaser.GameObjects.Text> = new Map();
    private mainPlayerUsername: Phaser.GameObjects.Text | null = null;
    private usernamesData: { id: string; username: string }[] = [];
    private playerId: string | null = null;

    private player!: Phaser.GameObjects.Sprite;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // Constants for grid and game settings
    private readonly CELL_SIZE = 50;
    private gridWidth = 0;
    private gridHeight = 0;
    private readonly PLAYER_SIZE = 50;
    private canMove = true;
    private gridObjects: GridObject[] = [];
    private isPlayerMoving = false;

    // Camera zoom settings
    private readonly MIN_ZOOM = 0.3;
    private readonly MAX_ZOOM = 1.3;
    private readonly ZOOM_STEP = 0.01;

    // Movement and interaction settings
    private readonly MOVE_DELAY = 250; // Delay between moves in milliseconds (increased from 150 to 250)
    private lastMoveTime = 0; // Timestamp of last move
    private backgroundTiles!: Phaser.GameObjects.TileSprite; // Background grid tiles
    private selectedObject: GridObject | null = null; // Currently selected object
    private spaceId: string = '';
    private path: { x: number; y: number }[] = []; // Store the current path
    private isMovingAlongPath = false; // Flag to track if player is moving along path
    private readonly MOVE_SPEED = 200; // Pixels per second
    private proximityUsers: ProximityUser[] = [];

    // Constructor for the scene
    constructor() {
        super({ key: 'MainScene' }); // 'MainScene' is the unique identifier for this scene
    }

    // Load all game assets (images, sprites, etc.)
    preload() {
        this.load.image('gridTile', '/tile1.png');
        this.load.spritesheet('dude', '/dude.png', {
            frameWidth: 32,
            frameHeight: 48,
        });

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
        this.createPlayerAnimations();

        // Load the tile image if not already loaded
        if (!this.textures.exists('gridTile')) {
            this.load.image('gridTile', '/tile1.png');
            await new Promise<void>((resolve) => {
                this.load.once('complete', () => {
                    resolve();
                });
                this.load.start();
            });
        } else {
        }

        this.createGrid();

        // Set up keyboard input for player movement
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Add mouse wheel zoom functionality
        this.input.on(
            'wheel',
            (
                pointer: Phaser.Input.Pointer,
                gameObjects: Phaser.GameObjects.GameObject[],
                deltaX: number,
                deltaY: number,
            ) => {
                const currentZoom = this.cameras.main.zoom;
                const zoomDelta = deltaY > 0 ? -this.ZOOM_STEP : this.ZOOM_STEP;
                const newZoom = Phaser.Math.Clamp(currentZoom + zoomDelta, this.MIN_ZOOM, this.MAX_ZOOM);

                // Get mouse position in world coordinates
                const mouseWorldX = this.cameras.main.scrollX + pointer.x / currentZoom;
                const mouseWorldY = this.cameras.main.scrollY + pointer.y / currentZoom;

                // Set new zoom level
                this.cameras.main.setZoom(newZoom);

                // Center the camera on the map when zoomed out
                if (newZoom <= this.MIN_ZOOM) {
                    const centerX = (this.gridWidth * this.CELL_SIZE) / 2;
                    const centerY = (this.gridHeight * this.CELL_SIZE) / 2;
                    this.cameras.main.centerOn(centerX, centerY);
                } else {
                    // Adjust camera position to zoom towards mouse
                    const newMouseWorldX = this.cameras.main.scrollX + pointer.x / newZoom;
                    const newMouseWorldY = this.cameras.main.scrollY + pointer.y / newZoom;

                    this.cameras.main.scrollX += mouseWorldX - newMouseWorldX;
                    this.cameras.main.scrollY += mouseWorldY - newMouseWorldY;
                }
            },
        );

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

        // Load existing space elements if spaceId is set
        if (this.spaceId) {
            await this.loadSpaceElements();
            // Create tiles after space data is loaded
            this.createTiles();

            // Set up the camera bounds and initial position
            this.cameras.main.setBounds(0, 0, this.gridWidth * this.CELL_SIZE, this.gridHeight * this.CELL_SIZE);
            this.cameras.main.setZoom(1);

            // Connect to WebSocket server
            this.connectToWebSocket();
        }

        // Make all existing sprites interactive
        this.gridObjects.forEach((obj) => {
            if (obj.sprite instanceof Phaser.GameObjects.Image || obj.sprite instanceof Phaser.GameObjects.Rectangle) {
                obj.sprite.setInteractive();
            }
        });
    }

    private async connectToWebSocket() {
        try {
            // Fetch token from /auth/me endpoint
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me`);
            const token = response.data.token;

            if (!token) {
                console.error('No authentication token found');
                return;
            }

            this.ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}`);

            this.ws.onopen = () => {
                // Join the space
                this.ws?.send(
                    JSON.stringify({
                        type: 'join', // client tells server that they want to join the space
                        payload: {
                            spaceId: this.spaceId,
                            token: token,
                        },
                    }),
                );
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data) as WebSocketMessage;

                switch (data.type) {
                    case 'space-joined': // server tells client that they have joined the space
                        const spaceJoinedPayload = data.payload as SpaceJoinedPayload;
                        this.playerId = spaceJoinedPayload.userId; // Store the player's ID
                        this.handleSpaceJoined(spaceJoinedPayload);
                        break;
                    case 'user-join': // server tells to all other clients that a new player has joined the space
                        const userJoinPayload = data.payload as UserJoinPayload;
                        if (userJoinPayload.userId !== this.playerId) {
                            this.handleUserJoined(userJoinPayload);
                        }
                        break;
                    case 'movement': // server tells client that a player has moved
                        const movementPayload = data.payload as MovementPayload;
                        if (movementPayload.userId !== this.playerId) {
                            this.handlePlayerMovement(movementPayload);
                        }
                        break;
                    case 'user-left': // server tells client that a player has left the space
                        this.handleUserLeft(data.payload as UserLeftPayload);
                        break;
                    case 'movement-rejected': // server tells client that a player's movement was rejected
                        this.handleMovementRejected(data.payload as MovePayload);
                        break;
                    case 'proximity-users': // server tells client about all users in proximity
                        this.handleProximityUsers(data.payload as ProximityUsersPayload);
                        break;
                    case 'proximity-call-created':
                        // Forward to React component
                        this.events.emit('proximity-call-created', data.payload);
                        break;
                    case 'proximity-call-updated':
                        // Forward to React component
                        this.events.emit('proximity-call-updated', data.payload);
                        break;
                    case 'proximity-calls-merged':
                        // Forward to React component
                        this.events.emit('proximity-calls-merged', data.payload);
                        break;
                    case 'user-left-proximity-call':
                        // Forward to React component
                        this.events.emit('user-left-proximity-call', data.payload);
                        break;
                    case 'chat-message':
                        // Forward to React component
                        this.events.emit('chat-message', data.payload);
                        break;
                    case 'chat-messages':
                        // Forward to React component
                        this.events.emit('chat-messages', data.payload);
                        break;
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {};
        } catch (error) {
            console.error('Error fetching auth token:', error);
        }
    }

    private handleProximityUsers(payload: ProximityUsersPayload) {
        this.proximityUsers = payload.users;
        // Emit the event to the React component
        this.events.emit('proximity-users', payload.users);
    }

    private handleSpaceJoined(payload: SpaceJoinedPayload) {
        if (!this.scene.isActive()) return;

        const { spawn, users, userId } = payload;

        // Create the player if it doesn't exist
        if (!this.player) {
            this.player = this.add.sprite(
                spawn.x * this.CELL_SIZE + this.CELL_SIZE / 2,
                spawn.y * this.CELL_SIZE + this.CELL_SIZE / 2,
                'dude',
            );

            // Set the scale to match the grid cell size
            const scale = (this.CELL_SIZE * 1.2) / 48; // 48 is the frame height
            this.player.setScale(scale);

            // Set the default animation
            this.player.anims.play('turn');
        } else {
            // Update existing player position
            this.player.x = spawn.x * this.CELL_SIZE + this.CELL_SIZE / 2;
            this.player.y = spawn.y * this.CELL_SIZE + this.CELL_SIZE / 2;
        }

        // Store player's ID
        this.playerId = userId;

        // Create main player username with a temporary value
        this.createMainPlayerUsername('Loading...');

        // Try to get the actual username immediately if available
        const actualUsername = this.getUsernameForPlayer(userId);
        if (actualUsername !== 'player') {
            if (this.mainPlayerUsername) {
                this.mainPlayerUsername.setText(actualUsername);
                console.log(`Set main player username immediately: ${actualUsername}`);
            }
        }

        // Create other players that are already in the space
        users.forEach((user) => {
            if (user.id !== this.playerId) {
                this.createOtherPlayer(user.id, user.x, user.y);
            }
        });

        // Set up camera to follow player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    private handleUserJoined(payload: UserJoinPayload) {
        const { userId, x, y } = payload;

        // Only create the player if they don't already exist and it's not the current player
        if (!this.otherPlayers.has(userId) && userId !== this.playerId && this.scene.isActive()) {
            this.createOtherPlayer(userId, x, y);
        }
    }

    private createOtherPlayer(id: string, x?: number, y?: number) {
        if (!this.scene.isActive()) return;

        const player = this.add.sprite(
            (x || 0) * this.CELL_SIZE + this.CELL_SIZE / 2,
            (y || 0) * this.CELL_SIZE + this.CELL_SIZE / 2,
            'dude',
        );

        // Set the scale to match the grid cell size
        const scale = (this.CELL_SIZE * 1.2) / 48; // 48 is the frame height
        player.setScale(scale);

        // Set the default animation
        player.anims.play('turn');

        this.otherPlayers.set(id, player);

        // Create username text above the player
        this.createPlayerUsername(id, x || 0, y || 0);
    }

    private createPlayerUsername(id: string, x: number, y: number) {
        if (!this.scene.isActive()) return;

        // Get username from the React component's avatars data
        const username = this.getUsernameForPlayer(id);

        const text = this.add.text(
            x * this.CELL_SIZE + this.CELL_SIZE / 2,
            y * this.CELL_SIZE + this.CELL_SIZE / 4, // Position above the player (reduced gap)
            username,
            {
                fontSize: '10px',
                color: 'white',
                stroke: 'gray',
                strokeThickness: 2,
                fontFamily: 'monospace',
                padding: {
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                },
            },
        );

        text.setOrigin(0.5, 1); // Center horizontally, align to bottom
        text.setDepth(4); // Above everything else

        this.playerUsernames.set(id, text);
    }

    private getUsernameForPlayer(id: string): string {
        const usernameData = this.usernamesData.find((u: { id: string; username: string }) => u.id === id);
        return usernameData ? usernameData.username.toLowerCase() : 'player';
    }

    // Method to set usernames from React component
    setUsernames(usernames: { id: string; username: string }[]) {
        this.usernamesData = usernames;

        // Update existing username texts
        this.playerUsernames.forEach((text, playerId) => {
            const usernameData = this.usernamesData.find((u) => u.id === playerId);
            if (usernameData) {
                text.setText(usernameData.username);
            }
        });

        // Update main player username if it exists
        if (this.mainPlayerUsername && this.playerId) {
            const mainPlayerUsernameData = this.usernamesData.find((u) => u.id === this.playerId);
            if (mainPlayerUsernameData) {
                this.mainPlayerUsername.setText(mainPlayerUsernameData.username);
            } else {
                this.mainPlayerUsername.setText('Unknown');
            }
        }
    }

    // Method to create username for the main player
    createMainPlayerUsername(username: string) {
        if (!this.scene.isActive() || !this.player) return;

        const text = this.add.text(
            this.player.x,
            this.player.y - 10, // Reduced gap to match remote players
            username,
            {
                fontSize: '10px',
                color: 'white',
                stroke: 'gray',
                strokeThickness: 2,
                fontFamily: 'monospace',
                padding: {
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                },
            },
        );

        text.setOrigin(0.5, 1); // Center horizontally, align to bottom
        text.setDepth(4); // Above everything else

        this.mainPlayerUsername = text;

        // If we have a player ID, try to get the actual username immediately
        if (this.playerId) {
            const actualUsername = this.getUsernameForPlayer(this.playerId);
            if (actualUsername !== 'player') {
                text.setText(actualUsername);
            }
        }
    }

    // Method to update main player username position
    updateMainPlayerUsernamePosition() {
        if (this.mainPlayerUsername && this.player) {
            this.mainPlayerUsername.x = this.player.x;
            this.mainPlayerUsername.y = this.player.y - 5; // Reduced gap to match remote players
        }
    }

    // Method to update all username font sizes based on camera zoom
    updateUsernameFontSizes() {
        const baseFontSize = 12;
        const zoomFactor = this.cameras.main.zoom;
        const adjustedFontSize = Math.max(baseFontSize / zoomFactor, 8); // Minimum 8px

        // Update main player username font size
        if (this.mainPlayerUsername) {
            this.mainPlayerUsername.setFontSize(adjustedFontSize);
        }

        // Update other players' username font sizes
        this.playerUsernames.forEach((text) => {
            text.setFontSize(adjustedFontSize);
        });
    }

    private handlePlayerMovement(payload: MovementPayload) {
        if (!this.scene.isActive()) return;

        const { userId, x, y } = payload;
        const player = this.otherPlayers.get(userId);
        if (player) {
            const oldX = player.x;
            const newX = x * this.CELL_SIZE + this.CELL_SIZE / 2;

            // Play appropriate animation based on movement direction
            if (newX < oldX) {
                if (player.anims.currentAnim?.key !== 'left') {
                    player.anims.play('left', true);
                }
            } else if (newX > oldX) {
                if (player.anims.currentAnim?.key !== 'right') {
                    player.anims.play('right', true);
                }
            }

            player.x = newX;
            player.y = y * this.CELL_SIZE + this.CELL_SIZE / 2;

            // Update username text position
            const usernameText = this.playerUsernames.get(userId);
            if (usernameText) {
                usernameText.x = newX;
                usernameText.y = player.y - 5; // Reduced gap to match creation
            }

            // Play turn animation after movement
            this.time.delayedCall(150, () => {
                // Only play turn animation if the player hasn't moved again
                if (
                    Math.abs(player.x - newX) < 1 &&
                    Math.abs(player.y - (y * this.CELL_SIZE + this.CELL_SIZE / 2)) < 1
                ) {
                    player.anims.play('turn');
                }
            });
        }
    }

    private handleUserLeft(payload: UserLeftPayload) {
        if (!this.scene.isActive()) return;

        const { userId } = payload;
        const player = this.otherPlayers.get(userId);
        if (player) {
            player.destroy();
            this.otherPlayers.delete(userId);
        }

        // Remove username text
        const usernameText = this.playerUsernames.get(userId);
        if (usernameText) {
            usernameText.destroy();
            this.playerUsernames.delete(userId);
        }
    }

    private handleMovementRejected(payload: MovePayload) {
        const { x, y } = payload;
        // Move player back to the valid position
        this.player.x = x * this.CELL_SIZE + this.CELL_SIZE / 2;
        this.player.y = y * this.CELL_SIZE + this.CELL_SIZE / 2;
    }

    // Create the background tiles
    private createTiles() {
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

        // Update camera bounds with new dimensions
        const totalWidth = this.gridWidth * this.CELL_SIZE;
        const totalHeight = this.gridHeight * this.CELL_SIZE;
        this.cameras.main.setBounds(0, 0, totalWidth, totalHeight);
    }

    // Load space elements from the backend
    private async loadSpaceElements() {
        try {
            if (!this.spaceId) {
                console.error('No spaceId available');
                return;
            }

            const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/${this.spaceId}`;
            const response = await axios.get(url);

            if (!response.data) {
                console.error('No space data found');
                return;
            }

            const space = response.data;

            // Set grid dimensions from space data
            const [width, height] = space.dimensions.split('x').map(Number);
            this.gridWidth = width;
            this.gridHeight = height;

            if (space && space.elements && space.elements.length > 0) {
                // Load each element's image first
                const loadPromises = space.elements.map(async (element: SpaceElementData) => {
                    const imageKey = `element_${element.id}`;
                    if (!this.textures.exists(imageKey)) {
                        return new Promise((resolve) => {
                            this.load.image(imageKey, element.element.image);
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
                space.elements.forEach((element: SpaceElementData) => {
                    this.addObjectToGrid(
                        element.x,
                        element.y,
                        `element_${element.id}`,
                        0xffffff,
                        element.element.width,
                        element.element.height,
                    );
                });
            }
        } catch (error) {
            console.error('Error loading space elements:', error);
            if (isAxiosError(error)) {
                console.error('Response data:', error.response?.data);
                console.error('Response status:', error.response?.status);
            }
        }
    }

    // Add a new object to the grid at specified coordinates
    private addObjectToGrid(
        gridX: number,
        gridY: number,
        type: string,
        color: number,
        width: number = 1,
        height: number = 1,
    ) {
        try {
            // Convert grid coordinates to pixel coordinates
            const x = gridX * this.CELL_SIZE + (width * this.CELL_SIZE) / 2;
            const y = gridY * this.CELL_SIZE + (height * this.CELL_SIZE) / 2;

            let sprite: Phaser.GameObjects.GameObject;

            // Check if the type is an image key (starts with 'element_')
            if (type.startsWith('element_')) {
                sprite = this.add
                    .image(x, y, type)
                    .setDisplaySize(width * this.CELL_SIZE, height * this.CELL_SIZE)
                    .setOrigin(0.5)
                    .setDepth(1); // Set depth to 1 for elements (above tiles, below player)
            } else {
                // Create a default rectangle for unknown types
                sprite = this.add
                    .rectangle(x, y, this.CELL_SIZE * width * 0.8, this.CELL_SIZE * height * 0.8, color)
                    .setDepth(1); // Set depth to 1 for elements
            }

            // Create a grid object to store the object's data
            const gridObject = {
                x: gridX,
                y: gridY,
                width,
                height,
                type,
                sprite,
            };

            // Add the object to the grid objects array
            this.gridObjects.push(gridObject);
        } catch (error) {
            console.error('Error adding object to grid:', error);
        }
    }

    // Helper method to find an object at specific grid coordinates
    getObjectAt(gridX: number, gridY: number): GridObject | undefined {
        return this.gridObjects.find(
            (obj) => gridX >= obj.x && gridX < obj.x + obj.width && gridY >= obj.y && gridY < obj.y + obj.height,
        );
    }

    // Helper method to check if a grid position is occupied
    isPositionOccupied(gridX: number, gridY: number, excludeObject?: GridObject): boolean {
        return this.gridObjects.some((obj) => {
            if (excludeObject && obj === excludeObject) return false;
            return gridX >= obj.x && gridX < obj.x + obj.width && gridY >= obj.y && gridY < obj.y + obj.height;
        });
    }

    // Main game update loop
    update(time: number) {
        if (this.isMovingAlongPath) {
            this.moveAlongPath();
            return;
        }

        if (!this.canMove || !this.player) return;

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
        } else {
            // If no keys are pressed, ensure we're in the turn animation
            if (this.player && this.player.anims && this.player.anims.currentAnim?.key !== 'turn') {
                this.player.anims.play('turn');
            }
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

        // Update username font sizes based on camera zoom
        this.updateUsernameFontSizes();
    }

    // Move the player in the specified direction
    private movePlayer(dx: number, dy: number) {
        if (!this.player) return;

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
            this.gridWidth * this.CELL_SIZE - this.PLAYER_SIZE / 2,
        );
        const newY = Phaser.Math.Clamp(
            this.player.y + dy,
            this.PLAYER_SIZE / 2,
            this.gridHeight * this.CELL_SIZE - this.PLAYER_SIZE / 2,
        );

        // Play appropriate animation based on movement direction
        if (dx < 0) {
            if (this.player.anims && this.player.anims.currentAnim?.key !== 'left') {
                this.player.anims.play('left', true);
            }
        } else if (dx > 0) {
            if (this.player.anims && this.player.anims.currentAnim?.key !== 'right') {
                this.player.anims.play('right', true);
            }
        } else if (dy !== 0) {
            // When moving vertically, use the last horizontal direction
            const currentAnim = this.player.anims?.currentAnim;
            if (!currentAnim || currentAnim.key === 'turn') {
                this.player.anims?.play('right', true);
            }
        }

        // Move player to new position
        this.player.x = newX;
        this.player.y = newY;

        // Update main player username position
        this.updateMainPlayerUsernamePosition();

        // Send movement update to server
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(
                JSON.stringify({
                    type: 'move',
                    payload: {
                        x: newGridX,
                        y: newGridY,
                    },
                }),
            );
        }

        // Set player as moving and start following
        this.isPlayerMoving = true;
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Re-enable movement after delay
        this.time.delayedCall(100, () => {
            this.canMove = true;
            // Only play turn animation if no movement keys are pressed
            if (
                this.player &&
                this.player.anims &&
                !this.cursors.left.isDown &&
                !this.cursors.right.isDown &&
                !this.cursors.up.isDown &&
                !this.cursors.down.isDown
            ) {
                this.player.anims.play('turn');
            }
        });
    }

    // Create the grid lines
    private createGrid() {
        const graphics = this.add.graphics();
        graphics.setDepth(3); // Set depth to 3 for grid lines (above everything)

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

    // Move player along path
    private moveAlongPath() {
        if (this.path.length === 0) {
            this.isMovingAlongPath = false;
            this.isPlayerMoving = false;
            this.cameras.main.stopFollow(); // Stop following when path is complete
            return;
        }

        const target = this.path[0];
        const targetX = target.x * this.CELL_SIZE + this.CELL_SIZE / 2;
        const targetY = target.y * this.CELL_SIZE + this.CELL_SIZE / 2;

        // Calculate direction to move
        const dx = targetX - this.player.x;
        const dy = targetY - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            // If we're close enough to the target
            this.path.shift(); // Remove the current target
            if (this.path.length === 0) {
                this.isMovingAlongPath = false;
                this.isPlayerMoving = false;
                this.cameras.main.stopFollow(); // Stop following when path is complete
            }
            return;
        }

        // Move towards target
        const speed = this.MOVE_SPEED * (1 / this.cameras.main.zoom);
        this.player.x += (dx / distance) * speed * (1 / 60);
        this.player.y += (dy / distance) * speed * (1 / 60);
    }

    setSpaceId(id: string) {
        this.spaceId = id;
        // If scene is already created, load elements
        if (this.scene.isActive()) {
            this.loadSpaceElements();
        }
    }

    // Send leave message to server
    private sendLeaveMessage() {
        if (this.ws?.readyState === WebSocket.OPEN && this.spaceId) {
            this.ws.send(
                JSON.stringify({
                    type: 'leave',
                    payload: {
                        spaceId: this.spaceId,
                    },
                }),
            );
        }
    }

    // Send chat message to server
    // we created this method here, but we're calling it in page.tsx
    sendChatMessage(message: string) {
        if (this.ws?.readyState === WebSocket.OPEN && this.spaceId) {
            this.ws.send(
                JSON.stringify({
                    type: 'send-chat-message',
                    payload: {
                        message: message,
                    },
                }),
            );
        }
    }

    // Request chat messages from server
    // we created this method here, but we're calling it in page.tsx
    requestChatMessages() {
        if (this.ws?.readyState === WebSocket.OPEN && this.spaceId) {
            this.ws.send(
                JSON.stringify({
                    type: 'get-chat-messages',
                    payload: {},
                }),
            );
        }
    }

    // Disable keyboard input (for chat)
    disableKeyboardInput() {
        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
        }
    }

    // Enable keyboard input (for game)
    enableKeyboardInput() {
        if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }
    }

    // Clean up WebSocket connection when scene is destroyed
    shutdown() {
        // Send leave message to server before closing connection
        this.sendLeaveMessage();

        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Clear all game objects and references
        if (this.player) {
            this.player.destroy();
        }

        // Clear other players
        this.otherPlayers.forEach((player) => {
            if (player && player.active) {
                player.destroy();
            }
        });
        this.otherPlayers.clear();

        // Clear player usernames
        this.playerUsernames.forEach((text) => {
            if (text && text.active) {
                text.destroy();
            }
        });
        this.playerUsernames.clear();

        // Clear main player username
        if (this.mainPlayerUsername && this.mainPlayerUsername.active) {
            this.mainPlayerUsername.destroy();
            this.mainPlayerUsername = null;
        }

        // Clear grid objects
        this.gridObjects.forEach((obj) => {
            if (obj.sprite && obj.sprite.active) {
                obj.sprite.destroy();
            }
        });
        this.gridObjects = [];

        // Clear background tiles
        if (this.backgroundTiles) {
            this.backgroundTiles.destroy();
        }

        // Clear input handlers
        if (this.input) {
            this.input.off('wheel');
            this.input.off('pointerdown');
            this.input.off('pointermove');
            this.input.off('pointerup');
            this.input.off('pointerout');
        }

        // Clear timers and animations
        if (this.time) {
            this.time.removeAllEvents();
        }

        // Clear camera
        if (this.cameras && this.cameras.main) {
            this.cameras.main.stopFollow();
        }

        // Clear player ID
        this.playerId = null;

        // Reset state flags
        this.canMove = true;
        this.isPlayerMoving = false;
        this.isMovingAlongPath = false;
        this.selectedObject = null;
        this.path = [];
    }

    private createPlayerAnimations() {
        // Create animations for the player sprite
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 8, // Reduced from 10 to 8 for smoother animation
            repeat: -1,
            yoyo: true, // Add yoyo effect for smoother transitions
        });

        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 20,
            repeat: 0, // Don't repeat the turn animation
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 8, // Reduced from 10 to 8 for smoother animation
            repeat: -1,
            yoyo: true, // Add yoyo effect for smoother transitions
        });
    }
}

// React component that wraps the Phaser game
const UserSpaceArena = forwardRef<
    {
        handleDeleteSelected?: () => void;
        cleanup?: () => Promise<void>;
        sendChatMessage?: (message: string) => void;
        requestChatMessages?: () => void;
        disableKeyboardInput?: () => void;
        enableKeyboardInput?: () => void;
    },
    {
        spaceId: string;
        userId: string;
        onCallStatusChange?: (status: {
            isInCall: boolean;
            callParticipantsCount: number;
            proximityUsersCount: number;
        }) => void;
        onChatMessage?: (message: ChatMessagePayload) => void;
        onChatMessages?: (messages: ChatMessagePayload[]) => void;
        isMeetingViewEnabled: boolean;
        setIsMeetingViewEnabled: (isMeetingViewEnabled: boolean) => void;
    }
>((props, ref) => {
    const {
        currentCallId,
        callParticipants,
        proximityUsers,
        currentCallInfo,
        audioEnabled,
        videoEnabled,
        toggleAudio,
        toggleVideo,
        handleProximityUpdate,
        joinProximityCall,
        leaveProximityCall,
    } = useWebRTC(props.spaceId, props.userId);

    // Helper function to get unique participants
    const getUniqueParticipants = useCallback(() => {
        return callParticipants.filter(
            (participant, index, self) => index === self.findIndex((p) => p.id === participant.id),
        );
    }, [callParticipants]);

    const [isGameReady, setIsGameReady] = useState(false);

    // Monitor participants and ensure video refs are set up
    useEffect(() => {
        const uniqueParticipants = getUniqueParticipants();

        uniqueParticipants.forEach((participant) => {
            if (!videoRefs.current[participant.id]) {
                videoRefs.current[participant.id] = React.createRef() as React.RefObject<HTMLVideoElement>;
            }
        });
    }, [callParticipants, getUniqueParticipants]);

    // Listen for proximity call events from the game scene
    useEffect(() => {
        if (!isGameReady || !gameRef.current) {
            return;
        }

        const scene = gameRef.current.scene.getScene('MainScene');
        if (!scene) {
            return;
        }

        const handleProximityCallCreated = (payload: {
            callId: string;
            participants: Array<{ userId: string; username: string }>;
        }) => {
            // Forward to useWebRTC hook by calling joinProximityCall
            // Pass the full participant objects to get usernames
            joinProximityCall(payload.callId, props.userId, payload.participants);
        };

        const handleProximityCallUpdated = (payload: {
            callId: string;
            participants: Array<{ userId: string; username: string }>;
        }) => {
            // Forward to useWebRTC hook by calling joinProximityCall
            // Pass the full participant objects to get usernames
            joinProximityCall(payload.callId, props.userId, payload.participants);
        };

        scene.events.on('proximity-call-created', handleProximityCallCreated);
        scene.events.on('proximity-call-updated', handleProximityCallUpdated);

        // Chat event handlers
        const handleChatMessage = (payload: ChatMessagePayload) => {
            if (props.onChatMessage) {
                props.onChatMessage(payload);
            }
        };

        const handleChatMessages = (payload: ChatMessagesPayload) => {
            if (props.onChatMessages) {
                props.onChatMessages(payload.messages);
            }
        };

        scene.events.on('chat-message', handleChatMessage);
        scene.events.on('chat-messages', handleChatMessages);

        return () => {
            scene.events.off('proximity-call-created', handleProximityCallCreated);
            scene.events.off('proximity-call-updated', handleProximityCallUpdated);
            scene.events.off('chat-message', handleChatMessage);
            scene.events.off('chat-messages', handleChatMessages);
        };
    }, [isGameReady, props.userId, joinProximityCall, props.onChatMessage, props.onChatMessages]);

    // Connect video streams to video elements
    useEffect(() => {
        // Add a small delay to ensure video elements are rendered
        const timeoutId = setTimeout(() => {
            const uniqueParticipants = callParticipants.filter(
                (participant, index, self) => index === self.findIndex((p) => p.id === participant.id),
            );

            uniqueParticipants.forEach((participant) => {
                const videoElement = videoRefs.current[participant.id]?.current;
                if (videoElement && participant.stream) {
                    videoElement.srcObject = participant.stream;
                } else {
                    console.warn(`No video element for participant: ${participant.id}`);
                }
            });
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [callParticipants]);

    // Attach MediaStream to video element when available
    useEffect(() => {
        const uniqueParticipants = callParticipants.filter(
            (participant, index, self) => index === self.findIndex((p) => p.id === participant.id),
        );

        uniqueParticipants.forEach((participant) => {
            const ref = videoRefs.current[participant.id];
            if (ref && ref.current && participant.stream instanceof MediaStream) {
                if (ref.current.srcObject !== participant.stream) {
                    ref.current.srcObject = participant.stream;
                }
            }
        });
    }, [callParticipants]);

    const gameRef = useRef<Phaser.Game | null>(null);

    const sceneRef = useRef<MainScene | null>(null);

    // --- Video refs for each participant ---
    const videoRefs = useRef<{ [userId: string]: React.RefObject<HTMLVideoElement> }>({});

    // Ensure a ref exists for each participant
    useEffect(() => {
        const uniqueParticipants = getUniqueParticipants();

        uniqueParticipants.forEach((participant) => {
            if (!videoRefs.current[participant.id]) {
                videoRefs.current[participant.id] = React.createRef() as React.RefObject<HTMLVideoElement>;
            }
        });
        // Clean up refs for participants who have left
        Object.keys(videoRefs.current).forEach((id) => {
            if (!uniqueParticipants.find((p) => p.id === id)) {
                delete videoRefs.current[id];
            }
        });
    }, [callParticipants, getUniqueParticipants]);

    // Callback to receive proximity data from the game scene
    const handleProximityUpdateFromScene = useCallback(
        (users: ProximityUser[]) => {
            handleProximityUpdate(users);
        },
        [handleProximityUpdate],
    );

    // Expose cleanup method through ref
    useImperativeHandle(
        ref,
        () => ({
            cleanup: async () => {
                // Leave any active proximity call
                if (currentCallId) {
                    leaveProximityCall();
                }

                // Call scene shutdown if it exists
                if (sceneRef.current) {
                    sceneRef.current.shutdown();
                    // Add a small delay to ensure WebSocket messages are sent
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }

                // Destroy the game instance
                if (gameRef.current) {
                    gameRef.current.destroy(true);
                    gameRef.current = null;
                    sceneRef.current = null;
                }
            },
            sendChatMessage: (message: string) => {
                if (sceneRef.current) {
                    sceneRef.current.sendChatMessage(message);
                }
            },
            requestChatMessages: () => {
                if (sceneRef.current) {
                    sceneRef.current.requestChatMessages();
                }
            },
            disableKeyboardInput: () => {
                if (sceneRef.current) {
                    sceneRef.current.disableKeyboardInput();
                }
            },
            enableKeyboardInput: () => {
                if (sceneRef.current) {
                    sceneRef.current.enableKeyboardInput();
                }
            },
        }),
        [currentCallId, leaveProximityCall],
    );

    useEffect(() => {
        // Notify parent component of call status changes
        if (props.onCallStatusChange) {
            props.onCallStatusChange({
                isInCall: !!currentCallId,
                callParticipantsCount: callParticipants.length,
                proximityUsersCount: proximityUsers.length,
            });
        }
    }, [currentCallId, callParticipants, proximityUsers, currentCallInfo, props.onCallStatusChange]);

    // Initialize the game when component mounts
    useEffect(() => {
        if (gameRef.current) return;

        // Game configuration
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: 'game-container',
            width: '100%',
            height: '100%',
            scene: MainScene,
            backgroundColor: '#000000',
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            audio: {
                disableWebAudio: true,
                noAudio: true,
            },
        };

        // Create the game instance
        gameRef.current = new Phaser.Game(config);

        // Wait for the scene to be ready
        gameRef.current.events.once('ready', () => {
            const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
            if (scene) {
                scene.setSpaceId(props.spaceId);
                sceneRef.current = scene;
                scene.events.on('proximity-users', handleProximityUpdateFromScene); // Listen for proximity updates from the scene
                setIsGameReady(true); // Mark game as ready

                // Pass usernames to the scene if available
                if (avatarsUrlsRef.current.length > 0) {
                    const usernames = avatarsUrlsRef.current.map((user) => ({
                        id: user.id,
                        username: user.username,
                    }));
                    scene.setUsernames(usernames);
                }
            }
        });

        // Cleanup when component unmounts
        return () => {
            if (sceneRef.current) {
                sceneRef.current.shutdown();
            }
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
                sceneRef.current = null;
            }
        };
    }, [props.spaceId]);

    // Update spaceId when it changes
    useEffect(() => {
        if (sceneRef.current) {
            sceneRef.current.setSpaceId(props.spaceId);
        }
    }, [props.spaceId]);

    const avatarsUrlsRef = useRef<{ id: string; username: string; avatarUrl: string | null }[]>([]);

    useEffect(() => {
        const fetchAllUsersAvatars = async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/get-all-users-avatars`);
            const data = await response.json();
            avatarsUrlsRef.current = data.avatarsUrls;

            // Pass usernames to the game scene if it's ready
            if (sceneRef.current) {
                const usernames = data.avatarsUrls.map(
                    (user: { id: string; username: string; avatarUrl: string | null }) => ({
                        id: user.id,
                        username: user.username,
                    }),
                );
                sceneRef.current.setUsernames(usernames);
            }
        };
        fetchAllUsersAvatars();
    }, [isGameReady]); // Re-run when game becomes ready

    // Get unique participants to avoid duplicate keys
    const uniqueParticipants = getUniqueParticipants();

    return (
        <div className="relative w-full h-full">
            {/* Video Boxes for Call Participants */}
            {uniqueParticipants.length > 0 && (
                <motion.div
                    className={`absolute left-1/2 transform -translate-x-1/2 right-auto z-30 flex flex-row justify-center items-center ${props.isMeetingViewEnabled ? 'w-full h-full top-0 bg-black' : 'top-4'}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.5, ease: 'easeOut', type: 'spring', bounce: 0.3, delay: 0.2 }}
                >
                    <div className={`flex flex-row gap-2 justify-center items-center w-full h-auto px-4`}>
                        {/* render video box for current user */}
                        <VideoBox
                            username="You"
                            videoRef={videoRefs.current[props.userId]}
                            variant="large"
                            avatarUrl={
                                avatarsUrlsRef.current.find((avatar) => avatar.id === props.userId)?.avatarUrl || null
                            }
                            videoEnabled={videoEnabled}
                            audioEnabled={audioEnabled}
                            showExpandButton={true}
                            toggleVideo={toggleVideo}
                            toggleAudio={toggleAudio}
                            isLocalUser={true}
                            isMeetingViewEnabled={props.isMeetingViewEnabled}
                            setIsMeetingViewEnabled={props.setIsMeetingViewEnabled}
                        />
                        {uniqueParticipants.map((participant, index) => {
                            if (participant.id === props.userId) return null;
                            let variant: 'small' | 'medium' | 'large' = 'large';
                            if (uniqueParticipants.length > 4) {
                                variant = 'small';
                            } else if (uniqueParticipants.length === 1) {
                                variant = 'large';
                            }

                            // Create a unique key combining id and index to prevent duplicates
                            const uniqueKey = `${participant.id}-${index}`;

                            return (
                                <VideoBox
                                    key={uniqueKey}
                                    videoRef={videoRefs.current[participant.id]}
                                    variant={variant}
                                    avatarUrl={
                                        avatarsUrlsRef.current.find((avatar) => avatar.id === participant.id)
                                            ?.avatarUrl || null
                                    }
                                    videoEnabled={participant.isVideoEnabled}
                                    audioEnabled={participant.isAudioEnabled}
                                    showExpandButton={true}
                                    username={participant.username}
                                    isLocalUser={participant.id === props.userId}
                                    isMeetingViewEnabled={props.isMeetingViewEnabled}
                                    setIsMeetingViewEnabled={props.setIsMeetingViewEnabled}
                                />
                            );
                        })}
                    </div>
                </motion.div>
            )}
            {/* Call Controls */}
            <CallControls
                isInCall={!!currentCallId}
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onLeaveCall={leaveProximityCall}
                participantCount={uniqueParticipants.length}
            />
            <div id="game-container" className="w-full h-full overflow-hidden" />
        </div>
    );
});

// Set display name for the component
UserSpaceArena.displayName = 'UserSpaceArena';

export default UserSpaceArena;
