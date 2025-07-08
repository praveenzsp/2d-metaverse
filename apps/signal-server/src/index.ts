// signal server
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// spaces is a map of space id to a set of user ids
const spaces = new Map<string, Set<string>>();

// usersSpaces is a map of user id to the space id they are in
// this is used for quick lookup of which space a user is in
const usersSpaces = new Map<string, string>();

// this stores the calls in a space and also stores the users in a specific call
// stores { spaceId: { callId: [userId1, userId2] } }
const spaceCalls = new Map<string, Map<string, Set<string>>>();

// Track which call each user is currently in: { userId: { spaceId, callId } }
const userCurrentCall = new Map<string, { spaceId: string; callId: string }>();

const createRandomCallId = () => {
    return Math.random().toString(36).substring(2, 15);
};

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    /**
     * User joins a space. Only receives the list of space members.
     */
    socket.on('join-space', (spaceId: string, userId: string) => {
        console.log(`User ${userId} joining space ${spaceId}`);

        if (!spaces.has(spaceId)) {
            spaces.set(spaceId, new Set<string>());
        }
        spaces.get(spaceId)?.add(userId);
        usersSpaces.set(userId, spaceId);
        socket.join(spaceId);

        // Store userId on socket for later use
        socket.data.userId = userId;

        // Send space members only to the joining user
        socket.emit('space-members', Array.from(spaces.get(spaceId) || []));

        // Notify others in the space about the new user
        io.to(spaceId).emit('user-joined', userId);
    });

    /**
     * User leaves a space. Remove from all calls and notify only relevant call participants.
     */
    socket.on('leave-space', (spaceId: string, userId: string) => {
        console.log(`User ${userId} leaving space ${spaceId}`);

        if (!spaces.has(spaceId)) return;

        // Remove user from all calls in this space
        if (spaceCalls.has(spaceId)) {
            const roomCallMap = spaceCalls.get(spaceId);
            if (roomCallMap) {
                for (const [callId, users] of roomCallMap.entries()) {
                    if (users.has(userId)) {
                        users.delete(userId);
                        // If no users left in the call, remove it
                        if (users.size === 0) {
                            roomCallMap.delete(callId);
                        }
                        // Notify only call participants
                        io.to(`call:${callId}`).emit('call-left', callId, userId);
                        socket.leave(`call:${callId}`);
                    }
                }
            }
        }

        // Remove user from call tracking
        userCurrentCall.delete(userId);

        spaces.get(spaceId)?.delete(userId);
        usersSpaces.delete(userId);
        socket.leave(spaceId);

        // Notify others in the space about the user leaving
        io.to(spaceId).emit('user-left', userId);
    });

    /**
     * Create a new call in a space. Only the creator is added to the call.
     */
    socket.on('create-call', (spaceId: string, userId: string) => {
        if (!spaces.has(spaceId)) return;

        const callId = createRandomCallId();

        // Initialize spaceCalls for this space if it doesn't exist
        if (!spaceCalls.has(spaceId)) {
            spaceCalls.set(spaceId, new Map<string, Set<string>>());
        }

        // create a new call with the creator as the first participant
        spaceCalls.get(spaceId)?.set(callId, new Set<string>([userId]));
        userCurrentCall.set(userId, { spaceId, callId });
        socket.join(`call:${callId}`);

        // Notify only the creator about the new call
        socket.emit('call-created', callId, [userId]);
    });

    /**
     * User joins a call. Only call participants are notified.
     */
    socket.on('join-call', (spaceId: string, callId: string, userId: string) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;

        // Check if user is already in a call
        const currentCall = userCurrentCall.get(userId);
        if (currentCall) {
            // User is already in a call, send error
            socket.emit('call-join-error', 'User is already in a call');
            return;
        }

        spaceCalls.get(spaceId)?.get(callId)?.add(userId);
        userCurrentCall.set(userId, { spaceId, callId });
        socket.join(`call:${callId}`);

        // Send the list of users in the call to the user who just joined
        socket.emit('call-members', Array.from(spaceCalls.get(spaceId)?.get(callId) || []));

        // Notify only call participants
        io.to(`call:${callId}`).emit('call-joined', callId, userId);
    });

    /**
     * User leaves a call. Only call participants are notified.
     */
    socket.on('leave-call', (spaceId: string, callId: string, userId: string) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;

        spaceCalls.get(spaceId)?.get(callId)?.delete(userId);
        userCurrentCall.delete(userId);
        socket.leave(`call:${callId}`);

        // If no users left in the call, remove the call entirely
        if (spaceCalls.get(spaceId)?.get(callId)?.size === 0) {
            spaceCalls.get(spaceId)?.delete(callId);
        }

        // Notify only call participants
        io.to(`call:${callId}`).emit('call-left', callId, userId);
    });

    /**
     * Get the current call for the user (if any).
     */
    socket.on('get-my-current-call', (userId: string) => {
        const currentCall = userCurrentCall.get(userId);
        socket.emit('my-current-call', currentCall || null);
    });

    /**
     * Send a message to the space (not call-specific).
     */
    socket.on('send-message', (spaceId: string, userId: string, message: string) => {
        if (!spaces.has(spaceId)) return;

        io.to(spaceId).emit('message', { userId, message, timestamp: Date.now() });
    });

    // --- WebRTC signaling events, all scoped to the call ---

    /**
     * Send an offer to a specific user in a call.
     */
    socket.on('offer', (spaceId: string, callId: string, targetUserId: string, offer: any) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        // Only emit to the call room
        io.to(`call:${callId}`).emit('offer', {
            from: userId,
            to: targetUserId,
            offer: offer,
        });
    });

    /**
     * Send an answer to a specific user in a call.
     */
    socket.on('answer', (spaceId: string, callId: string, targetUserId: string, answer: any) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        io.to(`call:${callId}`).emit('answer', {
            from: userId,
            to: targetUserId,
            answer: answer,
        });
    });

    /**
     * Send ICE candidate to a specific user in a call.
     */
    socket.on('ice-candidate', (spaceId: string, callId: string, targetUserId: string, candidate: any) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        io.to(`call:${callId}`).emit('ice-candidate', {
            from: userId,
            to: targetUserId,
            candidate: candidate,
        });
    });

    // --- Additional WebRTC events for connection management, scoped to call ---

    /**
     * Notify call participants of a connection request.
     */
    socket.on('connection-request', (spaceId: string, callId: string, targetUserId: string) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        io.to(`call:${callId}`).emit('connection-request', {
            from: userId,
            to: targetUserId,
        });
    });

    /**
     * Notify call participants of a connection acceptance.
     */
    socket.on('connection-accepted', (spaceId: string, callId: string, targetUserId: string) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        io.to(`call:${callId}`).emit('connection-accepted', {
            from: userId,
            to: targetUserId,
        });
    });

    /**
     * Notify call participants of a connection rejection.
     */
    socket.on('connection-rejected', (spaceId: string, callId: string, targetUserId: string) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        io.to(`call:${callId}`).emit('connection-rejected', {
            from: userId,
            to: targetUserId,
        });
    });

    /**
     * Notify call participants of a connection closure.
     */
    socket.on('connection-closed', (spaceId: string, callId: string, targetUserId: string) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        io.to(`call:${callId}`).emit('connection-closed', {
            from: userId,
            to: targetUserId,
        });
    });

    /**
     * User status events (ready/busy) scoped to call.
     */
    socket.on('user-ready', (spaceId: string, callId: string) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        io.to(`call:${callId}`).emit('user-ready', userId);
    });

    socket.on('user-busy', (spaceId: string, callId: string) => {
        if (!spaces.has(spaceId) || !spaceCalls.has(spaceId) || !spaceCalls.get(spaceId)?.has(callId)) return;
        const userId = socket.data.userId;
        if (!userId) return;
        io.to(`call:${callId}`).emit('user-busy', userId);
    });

    /**
     * Ping/pong for connection health.
     */
    socket.on('ping', () => {
        socket.emit('pong');
    });

    /**
     * Handle user disconnect. Remove from all calls and notify only relevant call participants.
     */
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);

        const userId = socket.data.userId;
        if (!userId) return;

        const spaceId = usersSpaces.get(userId);
        if (!spaceId) return;

        // Remove user from all calls in this space
        if (spaceCalls.has(spaceId)) {
            const roomCallMap = spaceCalls.get(spaceId);
            if (roomCallMap) {
                for (const [callId, users] of roomCallMap.entries()) {
                    if (users.has(userId)) {
                        users.delete(userId);
                        // If no users left in the call, remove it
                        if (users.size === 0) {
                            roomCallMap.delete(callId);
                        }
                        // Notify only call participants
                        io.to(`call:${callId}`).emit('call-left', callId, userId);
                        socket.leave(`call:${callId}`);
                    }
                }
            }
        }

        // Remove user from call tracking
        userCurrentCall.delete(userId);

        spaces.get(spaceId)?.delete(userId);
        usersSpaces.delete(userId);
        socket.leave(spaceId);
        io.to(spaceId).emit('user-disconnected', userId);
    });
});

httpServer.listen(process.env.PORT || 3002, () => {
    console.log('Signal Server is running on port 3002');
});
