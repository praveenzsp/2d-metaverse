// These are imports - they let us use code from other files
import type { User } from "./User";
import { OutgoingMessage, UserCallState, CallInfo, ProximityUser } from "./types";
import { v4 as uuidv4 } from 'uuid';

// This creates a class called RoomManager
// Think of it as a blueprint for managing rooms in our application
export class RoomManager {
    // This is a property of the class - it's like a variable that belongs to the class
    // Map is like an object that stores key-value pairs
    // Here, the key is a string (room ID) and the value is an array of Users
	// here roomId will be nothing but spaceId
    rooms: Map<string, User[]> = new Map();

    // Call state management properties
    userCallStates: Map<string, UserCallState> = new Map(); // userId -> call state
    activeCalls: Map<string, CallInfo> = new Map(); // callId -> call info
    spaceCalls: Map<string, Set<string>> = new Map(); // spaceId -> set of callIds

    // This is a special property that belongs to the class itself, not instances
    // We'll use this to ensure we only have one RoomManager in our app
    static instance: RoomManager;

    // This is the constructor - it runs when we create a new RoomManager
    // 'private' means we can't create RoomManager directly from outside
    private constructor() {
        this.rooms = new Map();
        this.userCallStates = new Map();
        this.activeCalls = new Map();
        this.spaceCalls = new Map();
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
        this.rooms.set(spaceId, (this.rooms.get(spaceId)?.filter((u) => u.userId !== user.userId) ?? []));
        
        // Clean up user's call state
        this.cleanupUserCallState(user.userId);
    }

    // This method adds a user to a room
    public addUser(spaceId: string, user: User) {
        // If the room doesn't exist, create it with just this user
        if (!this.rooms.has(spaceId)) {
            this.rooms.set(spaceId, [user]);
        } else {
            // Otherwise, add the user to the existing room
            this.rooms.set(spaceId, [...(this.rooms.get(spaceId) ?? []), user]);
        }
        
        // Initialize user's call state
        this.initializeUserCallState(user.userId, spaceId);
    }

    // This method sends a message to all users in a room except the sender
    public broadcast(message: OutgoingMessage, user: User, roomId: string) {
        if (!this.rooms.has(roomId)) {
            return;
        }
        // Go through each user in the room
        this.rooms.get(roomId)?.forEach((u) => {
            // Don't send the message to the sender
            if (u.userId !== user.userId) {
                u.send(message);
            }
        });
    }

    // Call state management methods

    /**
     * Initialize call state for a new user
     */
    public initializeUserCallState(userId: string, spaceId: string) {
        this.userCallStates.set(userId, {
            userId,
            callId: null,
            proximityUsers: [],
            spaceId
        });
    }

    /**
     * Clean up call state when user leaves
     */
    public cleanupUserCallState(userId: string) {
        const userCallState = this.userCallStates.get(userId);
        if (userCallState?.callId) {
            this.leaveCall(userId, userCallState.callId);
        }
        this.userCallStates.delete(userId);
    }

    /**
     * Get call state for a user
     */
    public getUserCallState(userId: string): UserCallState | undefined {
        return this.userCallStates.get(userId);
    }

    /**
     * Update user's proximity users and handle call logic
     */
    public handleProximityUpdate(userId: string, proximityUsers: ProximityUser[]) {
        console.log(`[RoomManager] Handling proximity update for user ${userId}:`, proximityUsers);
        
        const userCallState = this.getUserCallState(userId);
        if (!userCallState) {
            console.log(`[RoomManager] No call state found for user ${userId}`);
            return;
        }

        const proximityUserIds = proximityUsers.map(u => u.userId);
        userCallState.proximityUsers = proximityUserIds;

        if (proximityUsers.length === 0) {
            // No users in proximity - leave current call
            if (userCallState.callId) {
                console.log(`[RoomManager] No users in proximity, leaving call ${userCallState.callId}`);
                this.leaveCall(userId, userCallState.callId);
            }
        } else {
            // Users in proximity - handle call logic
            console.log(`[RoomManager] Users in proximity, handling call logic for ${userId}`);
            this.handleProximityCallLogic(userId, proximityUsers);
        }
    }

    /**
     * Handle proximity-based call logic
     */
    private handleProximityCallLogic(userId: string, proximityUsers: ProximityUser[]) {
        console.log(`[RoomManager] Handling proximity call logic for user ${userId}`);
        
        const userCallState = this.getUserCallState(userId);
        if (!userCallState) {
            console.log(`[RoomManager] No call state found for user ${userId} in call logic`);
            return;
        }

        const proximityUserIds = proximityUsers.map(u => u.userId);
        console.log(`[RoomManager] Proximity user IDs:`, proximityUserIds);
        
        const proximityCallStates = proximityUserIds.map(id => this.getUserCallState(id)).filter(Boolean) as UserCallState[];
        console.log(`[RoomManager] Proximity call states:`, proximityCallStates.map(s => ({ userId: s.userId, callId: s.callId })));
        
        // Get all active call IDs from proximity users
        const activeCallIds = new Set<string>();
        proximityCallStates.forEach(state => {
            if (state.callId) {
                activeCallIds.add(state.callId);
            }
        });

        console.log(`[RoomManager] Active call IDs:`, Array.from(activeCallIds));

        if (activeCallIds.size === 0) {
            // No active calls - create new call
            console.log(`[RoomManager] No active calls, creating new call for user ${userId}`);
            this.createProximityCall(userId, proximityUserIds);
        } else if (activeCallIds.size === 1) {
            // One active call - join existing call
            const callId = Array.from(activeCallIds)[0];
            console.log(`[RoomManager] One active call ${callId}, joining for user ${userId}`);
            this.joinProximityCall(userId, callId, proximityUserIds);
        } else {
            // Multiple active calls - merge calls
            console.log(`[RoomManager] Multiple active calls, merging for user ${userId}`);
            this.mergeCalls(userId, Array.from(activeCallIds), proximityUserIds);
        }
    }

    /**
     * Create a new proximity call
     */
    private createProximityCall(creatorId: string, participantIds: string[]) {
        console.log(`[RoomManager] Creating proximity call for creator ${creatorId} with participants:`, participantIds);
        
        const callId = uuidv4();
        const userCallState = this.getUserCallState(creatorId);
        if (!userCallState?.spaceId) {
            console.log(`[RoomManager] No user call state or space ID for creator ${creatorId}`);
            return;
        }

        // Create call info
        const callInfo: CallInfo = {
            callId,
            participants: new Set([creatorId, ...participantIds]),
            spaceId: userCallState.spaceId,
            createdAt: new Date(),
            creatorId
        };

        console.log(`[RoomManager] Created call info:`, {
            callId,
            participants: Array.from(callInfo.participants),
            spaceId: callInfo.spaceId,
            creatorId: callInfo.creatorId
        });

        // Add call to active calls
        this.activeCalls.set(callId, callInfo);

        // Add call to space calls
        if (!this.spaceCalls.has(userCallState.spaceId)) {
            this.spaceCalls.set(userCallState.spaceId, new Set());
        }
        this.spaceCalls.get(userCallState.spaceId)!.add(callId);

        // Update all participants' call states
        [creatorId, ...participantIds].forEach(participantId => {
            const participantState = this.getUserCallState(participantId);
            if (participantState) {
                participantState.callId = callId;
                console.log(`[RoomManager] Updated call state for participant ${participantId} to call ${callId}`);
            } else {
                console.log(`[RoomManager] No call state found for participant ${participantId}`);
            }
        });

        // Notify all participants about the new call
        this.notifyCallParticipants(callId, 'proximity-call-created', {
            callId,
            participants: Array.from(callInfo.participants)
        });

        console.log(`[RoomManager] Created proximity call ${callId} with participants:`, Array.from(callInfo.participants));
    }

    /**
     * Join an existing proximity call
     */
    private joinProximityCall(userId: string, callId: string, proximityUserIds: string[]) {
        const callInfo = this.activeCalls.get(callId);
        if (!callInfo) return;

        const userCallState = this.getUserCallState(userId);
        if (!userCallState) return;

        // Add user to call
        callInfo.participants.add(userId);
        userCallState.callId = callId;

        // Add proximity users who aren't already in the call
        proximityUserIds.forEach(proximityUserId => {
            if (!callInfo.participants.has(proximityUserId)) {
                callInfo.participants.add(proximityUserId);
                const proximityState = this.getUserCallState(proximityUserId);
                if (proximityState) {
                    proximityState.callId = callId;
                }
            }
        });

        // Notify all participants about the updated call
        this.notifyCallParticipants(callId, 'proximity-call-updated', {
            callId,
            participants: Array.from(callInfo.participants)
        });

        console.log(`User ${userId} joined proximity call ${callId}`);
    }

    /**
     * Merge multiple calls into one
     */
    private mergeCalls(userId: string, callIds: string[], proximityUserIds: string[]) {
        if (callIds.length < 2) return;

        // Use the first call as the target call
        const targetCallId = callIds[0];
        const targetCall = this.activeCalls.get(targetCallId);
        if (!targetCall) return;

        // Merge all participants from other calls into the target call
        callIds.slice(1).forEach(callId => {
            const callToMerge = this.activeCalls.get(callId);
            if (callToMerge) {
                // Add participants to target call
                callToMerge.participants.forEach(participantId => {
                    targetCall.participants.add(participantId);
                    const participantState = this.getUserCallState(participantId);
                    if (participantState) {
                        participantState.callId = targetCallId;
                    }
                });

                // Remove the merged call
                this.activeCalls.delete(callId);
                if (targetCall.spaceId) {
                    this.spaceCalls.get(targetCall.spaceId)?.delete(callId);
                }
            }
        });

        // Add proximity users who aren't already in the call
        proximityUserIds.forEach(proximityUserId => {
            if (!targetCall.participants.has(proximityUserId)) {
                targetCall.participants.add(proximityUserId);
                const proximityState = this.getUserCallState(proximityUserId);
                if (proximityState) {
                    proximityState.callId = targetCallId;
                }
            }
        });

        // Notify all participants about the merged call
        this.notifyCallParticipants(targetCallId, 'proximity-calls-merged', {
            callId: targetCallId,
            participants: Array.from(targetCall.participants)
        });

        console.log(`Merged calls into ${targetCallId} with participants:`, Array.from(targetCall.participants));
    }

    /**
     * Leave a call
     */
    public leaveCall(userId: string, callId: string) {
        const callInfo = this.activeCalls.get(callId);
        if (!callInfo) return;

        // Remove user from call
        callInfo.participants.delete(userId);

        // Update user's call state
        const userCallState = this.getUserCallState(userId);
        if (userCallState) {
            userCallState.callId = null;
        }

        // Notify remaining participants
        this.notifyCallParticipants(callId, 'user-left-proximity-call', {
            callId,
            leftUserId: userId,
            remainingParticipants: Array.from(callInfo.participants)
        });

        // Clean up empty calls
        if (callInfo.participants.size === 0) {
            this.activeCalls.delete(callId);
            if (callInfo.spaceId) {
                this.spaceCalls.get(callInfo.spaceId)?.delete(callId);
            }
            console.log(`Call ${callId} removed - no participants remaining`);
        }

        console.log(`User ${userId} left call ${callId}`);
    }

    /**
     * Notify all participants in a call
     */
    private notifyCallParticipants(callId: string, messageType: string, payload: any) {
        console.log(`[RoomManager] Notifying participants of call ${callId} with message type: ${messageType}`, payload);
        
        const callInfo = this.activeCalls.get(callId);
        if (!callInfo) {
            console.log(`[RoomManager] No call info found for call ${callId}`);
            return;
        }

        console.log(`[RoomManager] Notifying participants:`, Array.from(callInfo.participants));
        
        callInfo.participants.forEach(participantId => {
            const user = this.findUserById(participantId);
            if (user) {
                console.log(`[RoomManager] Sending ${messageType} to user ${participantId}`);
                user.send({
                    type: messageType,
                    payload
                });
            } else {
                console.log(`[RoomManager] User ${participantId} not found for notification`);
            }
        });
    }

    /**
     * Find user by ID across all rooms
     */
    private findUserById(userId: string): User | null {
        for (const users of this.rooms.values()) {
            const user = users.find(u => u.userId === userId);
            if (user) return user;
        }
        return null;
    }

    /**
     * Get all active calls in a space
     */
    public getSpaceCalls(spaceId: string): CallInfo[] {
        const callIds = this.spaceCalls.get(spaceId);
        if (!callIds) return [];

        return Array.from(callIds)
            .map(callId => this.activeCalls.get(callId))
            .filter(Boolean) as CallInfo[];
    }

    /**
     * Get user's current call info
     */
    public getUserCallInfo(userId: string): CallInfo | null {
        const userCallState = this.getUserCallState(userId);
        if (!userCallState?.callId) return null;

        return this.activeCalls.get(userCallState.callId) || null;
    }
}