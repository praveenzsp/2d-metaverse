// These are imports - they let us use code from other files
import { WebSocket } from 'ws';
import { RoomManager } from './RoomManager';
import { OutgoingMessage, ProximityUser } from './types';
import prisma from '@repo/db/client';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWT_SECRET } from './config';

// This is the User class - it represents a connected user in our system
export class User {
    // These are properties that every User will have
    public userId: string; // The unique identifier for this user
    public username: string; // The username of the user
    private spaceId?: string; // The ID of the space/room they're in (optional)
    private x: number; // Their X position in the space
    private y: number; // Their Y position in the space
    private ws: WebSocket; // Their WebSocket connection
    private PROXIMITY_CELLS = 1;

    // This is the constructor - it runs when we create a new User
    constructor(ws: WebSocket) {
        this.userId = ''; // Will be set after JWT verification
        this.username = ''; // Will be set after JWT verification
        this.x = 0; // Start at position (0,0)
        this.y = 0;
        this.ws = ws; // Store their WebSocket connection
        this.initHandlers(); // Set up message handling
    }

    // get all users who are in the proximity of the user
    private getAllUsersInProximity = (): ProximityUser[] => {
        const allUsersInSpace = RoomManager.getInstance().rooms.get(this.spaceId!) ?? [];
        return allUsersInSpace
            .filter((user) => {
                const xDiff = Math.abs(user.x - this.x);
                const yDiff = Math.abs(user.y - this.y);
                return xDiff <= this.PROXIMITY_CELLS && yDiff <= this.PROXIMITY_CELLS && user.userId !== this.userId;
            })
            .map(user => ({
                userId: user.userId,
                username: user.username,
                x: user.x,
                y: user.y
            }));
    };

    // This method sets up how the user handles incoming messages
    initHandlers() {
        // When we receive a message from the user
        this.ws.on('message', async (data) => {
            // Convert the message from binary to text and then to an object
            const parsedData = JSON.parse(data.toString());

            // Handle different types of messages
            switch (parsedData.type) {
                case 'join':
                    // When a user wants to join a space
                    const spaceId = parsedData.payload.spaceId;
                    const token = parsedData.payload.token;

                    // Verify their JWT token
                    const decodedToken = jwt.verify(token, JWT_SECRET) as JwtPayload;
                    if (!decodedToken.userId) {
                        this.ws.close(); // Close connection if invalid token
                        return;
                    }

                    // Generate a unique connection ID by combining userId with a timestamp
                    this.userId = `${decodedToken.userId}`;
                    this.username = decodedToken.username as string;

                    // Check if the space exists in the database
                    const space = await prisma.space.findFirst({
                        where: {
                            id: spaceId,
                        },
                    });

                    if (!space) {
                        this.ws.close(); // Close if space doesn't exist
                        return;
                    }

                    // Add user to the space
                    this.spaceId = spaceId;
                    RoomManager.getInstance().addUser(spaceId, this);

                    // Place them at a random position in the space
                    this.x = Math.floor(Math.random() * space?.width!);
                    this.y = Math.floor(Math.random() * space?.height!);

                    // Get existing users in the space
                    const existingUsers =
                        RoomManager.getInstance()
                            .rooms.get(spaceId)
                            ?.filter((x) => x.userId !== this.userId) ?? [];

                    // Tell the user that they've joined and where user is
                    this.send({
                        type: 'space-joined',
                        payload: {
                            userId: this.userId,
                            username: this.username,
                            spawn: {
                                x: this.x,
                                y: this.y,
                            },
                            users: existingUsers.map((u) => ({
                                id: u.userId,
                                username: u.username,
                                x: u.x,
                                y: u.y,
                            })),
                        },
                    });

                    // Tell everyone else that a new user joined
                    RoomManager.getInstance().broadcast(
                        {
                            type: 'user-join',
                            payload: {
                                userId: this.userId,
                                username: this.username,
                                x: this.x,
                                y: this.y,
                            },
                        },
                        this,
                        this.spaceId!,
                    );

                    // Send the new user information to all existing users in the space
                    existingUsers.forEach((user) => {
                        this.send({
                            type: 'user-join',
                            payload: {
                                userId: user.userId,
                                username: user.username,
                                x: user.x,
                                y: user.y,
                            },
                        });
                    });

                    // Handle initial proximity update
                    this.handleProximityUpdate();
                    break;

                case 'move':
                    // When a user wants to move
                    const moveX = parsedData.payload.x; // new x position of user
                    const moveY = parsedData.payload.y; // new y position of user

                    // Calculate how far they're trying to move
                    const xDisplacement = Math.abs(this.x - moveX);
                    const yDisplacement = Math.abs(this.y - moveY);

                    // Only allow moving one step at a time (up, down, left, right)
                    if ((xDisplacement == 1 && yDisplacement == 0) || (xDisplacement == 0 && yDisplacement == 1)) {
                        this.x = moveX;
                        this.y = moveY;
                        
                        // Tell everyone about the movement
                        RoomManager.getInstance().broadcast(
                            {
                                type: 'movement',
                                payload: {
                                    userId: this.userId,
                                    username: this.username,
                                    x: this.x,
                                    y: this.y,
                                },
                            },
                            this,
                            this.spaceId!,
                        );

                        // Handle proximity update after movement
                        this.handleProximityUpdate();
                        return;
                    }

                    // If they tried to move too far, reject the movement
                    this.send({
                        type: 'movement-rejected',
                        payload: {
                            username: this.username,
                            x: this.x,
                            y: this.y,
                        },
                    });
                    break;

                case 'leave':
                    this.destroy();
                    break;

                // New call management messages
                case 'get-call-info':
                    this.sendCallInfo();
                    break;

                case 'leave-proximity-call':
                    this.leaveCurrentCall();
                    break;
            }
        });
    }

    /**
     * Handle proximity updates and trigger call logic
     */
    private handleProximityUpdate() {
        const proximityUsers = this.getAllUsersInProximity();
        
        // Send proximity users to the client
        this.send({
            type: 'proximity-users',
            payload: {
                users: proximityUsers,
            },
        });

        // Handle proximity-based call logic in RoomManager
        RoomManager.getInstance().handleProximityUpdate(this.userId, proximityUsers);
    }

    /**
     * Send current call information to the user
     */
    private sendCallInfo() {
        const callInfo = RoomManager.getInstance().getUserCallInfo(this.userId);
        if (callInfo) {
            this.send({
                type: 'call-info',
                payload: {
                    callId: callInfo.callId,
                    participants: Array.from(callInfo.participants).map(participantId => {
                        const user = RoomManager.getInstance().findUserById(participantId);
                        return {
                            userId: participantId,
                            username: user?.username || 'Unknown'
                        };
                    }),
                    spaceId: callInfo.spaceId,
                    createdAt: callInfo.createdAt,
                    creatorId: callInfo.creatorId
                }
            });
        } else {
            this.send({
                type: 'call-info',
                payload: null
            });
        }
    }

    /**
     * Leave current call
     */
    private leaveCurrentCall() {
        const userCallState = RoomManager.getInstance().getUserCallState(this.userId);
        if (userCallState?.callId) {
            RoomManager.getInstance().leaveCall(this.userId, userCallState.callId);
        }
    }

    // This method is called when the user disconnects
    destroy() {
        // Tell everyone the user left
        RoomManager.getInstance().broadcast(
            {
                type: 'user-left',
                payload: {
                    userId: this.userId,
                    username: this.username,
                },
            },
            this,
            this.spaceId!,
        );
        // Remove them from the room
        RoomManager.getInstance().removeUser(this, this.spaceId!);
    }

    // This method sends a message to this user
    send(payload: OutgoingMessage) {
        this.ws.send(JSON.stringify(payload));
    }
}
