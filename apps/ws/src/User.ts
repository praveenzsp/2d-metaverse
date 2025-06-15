// These are imports - they let us use code from other files
import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { OutgoingMessage } from "./types";
import prisma from "@repo/db/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "./config";

// This is a helper function that creates a random string
// Used to generate unique IDs for users
function getRandomString(length: number) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// This is the User class - it represents a connected user in our system
export class User {
    // These are properties that every User will have
    public id: string;          // A unique ID for this user
    public userId?: string;     // The user's ID from the database (optional)
    private spaceId?: string;   // The ID of the space/room they're in (optional)
    private x: number;          // Their X position in the space
    private y: number;          // Their Y position in the space
    private ws: WebSocket;      // Their WebSocket connection

    // This is the constructor - it runs when we create a new User
    constructor(ws: WebSocket) {
        this.id = getRandomString(10);  // Give them a random ID
        this.x = 0;                     // Start at position (0,0)
        this.y = 0;
        this.ws = ws;                   // Store their WebSocket connection
        this.initHandlers()             // Set up message handling
    }

    // This method sets up how the user handles incoming messages
    initHandlers() {
        // When we receive a message from the user
        this.ws.on("message", async (data) => {
            // Convert the message from binary to text and then to an object
            const parsedData = JSON.parse(data.toString());
            
            // Handle different types of messages
            switch (parsedData.type) {
                case "join":
                    // When a user wants to join a space
                    const spaceId = parsedData.payload.spaceId;
                    const token = parsedData.payload.token;
                    
                    // Verify their JWT token
                    const decodedToken = jwt.verify(token, JWT_SECRET) as JwtPayload;
                    if (!decodedToken.userId) {
                        this.ws.close()  // Close connection if invalid token
                        return
                    }
                    
                    // Generate a unique connection ID by combining userId with a timestamp
                    this.userId = `${decodedToken.userId}-${Date.now()}`;
                    
                    // Check if the space exists in the database
                    const space = await prisma.space.findFirst({
                        where: {
                            id: spaceId
                        }
                    })
                    
                    if (!space) {
                        this.ws.close()  // Close if space doesn't exist
                        return;
                    }
                    
                    // Add user to the space
                    this.spaceId = spaceId
                    RoomManager.getInstance().addUser(spaceId, this);
                    
                    // Place them at a random position in the space
                    this.x = Math.floor(Math.random() * space?.width!);
                    this.y = Math.floor(Math.random() * space?.height!);
                    
                    // Get existing users in the space
                    const existingUsers = RoomManager.getInstance().rooms.get(spaceId)?.filter(x => x.id !== this.id) ?? [];
                    
                    // Tell the user that they've joined and where user is
                    this.send({
                        type: "space-joined",
                        payload: {
                            userId: this.userId,
                            spawn: {
                                x: this.x,
                                y: this.y
                            },
                            users: existingUsers.map(u => ({
                                id: u.userId,
                                x: u.x,
                                y: u.y
                            }))
                        }
                    });
                    
                    // Tell everyone else that a new user joined
                    RoomManager.getInstance().broadcast({
                        type: "user-join",
                        payload: {
                            userId: this.userId,
                            x: this.x,
                            y: this.y
                        }
                    }, this, this.spaceId!);

                    // Send the new user information about all existing users
                    existingUsers.forEach(user => {
                        this.send({
                            type: "user-join",
                            payload: {
                                userId: user.userId,
                                x: user.x,
                                y: user.y
                            }
                        });
                    });
                    break;

                case "move":
                    // When a user wants to move
                    const moveX = parsedData.payload.x;
                    const moveY = parsedData.payload.y;
                    
                    // Calculate how far they're trying to move
                    const xDisplacement = Math.abs(this.x - moveX);
                    const yDisplacement = Math.abs(this.y - moveY);
                    
                    // Only allow moving one step at a time (up, down, left, right)
                    if ((xDisplacement == 1 && yDisplacement== 0) || (xDisplacement == 0 && yDisplacement == 1)) {
                        this.x = moveX;
                        this.y = moveY;
                        // Tell everyone about the movement
                        RoomManager.getInstance().broadcast({
                            type: "movement",
                            payload: {
                                userId: this.userId,
                                x: this.x,
                                y: this.y
                            }
                        }, this, this.spaceId!);
                        return;
                    }
                    
                    // If they tried to move too far, reject the movement
                    this.send({
                        type: "movement-rejected",
                        payload: {
                            x: this.x,
                            y: this.y
                        }
                    });
            }
        });
    }

    // This method is called when the user disconnects
    destroy() {
        // Tell everyone the user left
        RoomManager.getInstance().broadcast({
            type: "user-left",
            payload: {
                userId: this.userId
            }
        }, this, this.spaceId!);
        // Remove them from the room
        RoomManager.getInstance().removeUser(this, this.spaceId!);
    }

    // This method sends a message to this user
    send(payload: OutgoingMessage) {
        this.ws.send(JSON.stringify(payload));
    }
}