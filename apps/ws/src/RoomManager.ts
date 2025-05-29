// These are imports - they let us use code from other files
import type { User } from "./User";
import { OutgoingMessage } from "./types";

// This creates a class called RoomManager
// Think of it as a blueprint for managing rooms in our application
export class RoomManager {
    // This is a property of the class - it's like a variable that belongs to the class
    // Map is like an object that stores key-value pairs
    // Here, the key is a string (room ID) and the value is an array of Users
	// here roomId will be nothing but spaceId
    rooms: Map<string, User[]> = new Map();

    // This is a special property that belongs to the class itself, not instances
    // We'll use this to ensure we only have one RoomManager in our app
    static instance: RoomManager;

    // This is the constructor - it runs when we create a new RoomManager
    // 'private' means we can't create RoomManager directly from outside
    private constructor() {
        this.rooms = new Map();
    }

    // This is a static method - it belongs to the class, not instances
    // It ensures we only have one RoomManager (Singleton pattern)
    static getInstance() {
        if (!this.instance) {
            this.instance = new RoomManager();
        }
        return this.instance;
    }

    // This method removes a user from a room
    public removeUser(user: User, spaceId: string) {
        // If the room doesn't exist, do nothing
        if (!this.rooms.has(spaceId)) {
            return;
        }
        // Filter out the user from the room's user list
        this.rooms.set(spaceId, (this.rooms.get(spaceId)?.filter((u) => u.id !== user.id) ?? []));
    }

    // This method adds a user to a room
    public addUser(spaceId: string, user: User) {
        // If the room doesn't exist, create it with just this user
        if (!this.rooms.has(spaceId)) {
            this.rooms.set(spaceId, [user]);
            return;
        }
        // Otherwise, add the user to the existing room
        this.rooms.set(spaceId, [...(this.rooms.get(spaceId) ?? []), user]);
    }

    // This method sends a message to all users in a room except the sender
    public broadcast(message: OutgoingMessage, user: User, roomId: string) {
        if (!this.rooms.has(roomId)) {
            return;
        }
        // Go through each user in the room
        this.rooms.get(roomId)?.forEach((u) => {
            // Don't send the message to the sender
            if (u.id !== user.id) {
                u.send(message);
            }
        });
    }
}