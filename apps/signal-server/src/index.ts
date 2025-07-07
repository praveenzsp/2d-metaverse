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

// rooms is a map of room id to a set of user ids
const rooms = new Map<string, Set<string>>();

// usersRooms is a map of user id to the room id they are in
// this is used for quick lookup of which room a user is in
const usersRooms = new Map<string, string>();


// this stores the calls in a room and also stores the users in a specific call
// stores { roomId: { callId: [userId1, userId2] } }
const roomCalls = new Map<string, Map<string, Set<string>>>();

// Track which call each user is currently in: { userId: { roomId, callId } }
const userCurrentCall = new Map<string, { roomId: string, callId: string }>();

const createRandomCallId = ()=>{
    return Math.random().toString(36).substring(2, 15);
}

// Helper function to get all active calls in a room
const getActiveCallsInRoom = (roomId: string) => {
    if (!roomCalls.has(roomId)) return [];
    
    const calls = [];
    const roomCallMap = roomCalls.get(roomId);
    if (roomCallMap) {
        for (const [callId, users] of roomCallMap.entries()) {
            calls.push({ callId, participants: Array.from(users) });
        }
    }
    return calls;
};

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join-room', (roomId: string, userId: string) => {
        console.log(`User ${userId} joining room ${roomId}`);
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set<string>());
        }
        rooms.get(roomId)?.add(userId);
        usersRooms.set(userId, roomId);
        socket.join(roomId);

        // Store userId on socket for later use
        socket.data.userId = userId;

        // Send room members only to the joining user
        socket.emit('room-members', Array.from(rooms.get(roomId) || []));

        // Send active calls in the room to the joining user
        const activeCalls = getActiveCallsInRoom(roomId);
        socket.emit('active-calls', activeCalls);

        // Notify others in the room about the new user
        io.to(roomId).emit('user-joined', userId);
    });

    socket.on('leave-room', (roomId: string, userId: string) => {
        console.log(`User ${userId} leaving room ${roomId}`);
        
        if (!rooms.has(roomId)) return;

        // Remove user from all calls in this room
        if (roomCalls.has(roomId)) {
            const roomCallMap = roomCalls.get(roomId);
            if (roomCallMap) {
                for (const [callId, users] of roomCallMap.entries()) {
                    if (users.has(userId)) {
                        users.delete(userId);
                        // If no users left in the call, remove it
                        if (users.size === 0) {
                            roomCallMap.delete(callId);
                        }
                        io.to(roomId).emit('call-left', callId, userId);
                    }
                }
            }
        }

        // Remove user from call tracking
        userCurrentCall.delete(userId);

        rooms.get(roomId)?.delete(userId);
        usersRooms.delete(userId);
        socket.leave(roomId);

        // Notify others in the room about the user leaving
        io.to(roomId).emit('user-left', userId);
    });

    socket.on('create-call', (roomId:string)=>{
        if (!rooms.has(roomId)) return;

        const callId = createRandomCallId();

        // Initialize roomCalls for this room if it doesn't exist
        if (!roomCalls.has(roomId)) {
            roomCalls.set(roomId, new Map<string, Set<string>>());
        }

        // create a new call with empty set of users
        roomCalls.get(roomId)?.set(callId, new Set<string>());

        // notify all users in the room about the new call
        io.to(roomId).emit('call-created', callId, roomCalls.get(roomId)?.get(callId));
    });

    socket.on('join-call', (roomId:string, callId: string, userId: string)=>{
        if(!rooms.has(roomId) || !roomCalls.has(roomId) || !roomCalls.get(roomId)?.has(callId)) return;

        // Check if user is already in a call
        const currentCall = userCurrentCall.get(userId);
        if (currentCall) {
            // User is already in a call, send error
            socket.emit('call-join-error', 'User is already in a call');
            return;
        }

        roomCalls.get(roomId)?.get(callId)?.add(userId);
        
        // Track that this user is now in this call
        userCurrentCall.set(userId, { roomId, callId });

        io.to(roomId).emit('call-joined', callId, userId);
    });

    socket.on('leave-call', (roomId:string, callId: string, userId: string)=>{
        if(!rooms.has(roomId) || !roomCalls.has(roomId) || !roomCalls.get(roomId)?.has(callId)) return;
        
        roomCalls.get(roomId)?.get(callId)?.delete(userId);
        
        // Remove user from call tracking
        userCurrentCall.delete(userId);
        
        // If no users left in the call, remove the call entirely
        if (roomCalls.get(roomId)?.get(callId)?.size === 0) {
            roomCalls.get(roomId)?.delete(callId);
        }
        
        io.to(roomId).emit('call-left', callId, userId);
    });

    socket.on('get-active-calls', (roomId: string) => {
        if (!rooms.has(roomId)) return;
        
        const activeCalls = getActiveCallsInRoom(roomId);
        socket.emit('active-calls', activeCalls);
    });

    socket.on('get-my-current-call', (userId: string) => {
        const currentCall = userCurrentCall.get(userId);
        socket.emit('my-current-call', currentCall || null);
    });

    socket.on('send-message', (roomId: string, userId: string, message: string) => {
        if (!rooms.has(roomId)) return;

        io.to(roomId).emit('message', { userId, message, timestamp: Date.now() });
    });

    //webrtc signaling events
    socket.on('offer', (roomId: string, targetUserId: string, offer: any) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('offer', {
            from: userId,
            to: targetUserId,
            offer: offer,
        });
    });

    socket.on('answer', (roomId: string, targetUserId: string, answer: any) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('answer', {
            from: userId,
            to: targetUserId,
            answer: answer,
        });
    });

    socket.on('ice-candidate', (roomId: string, targetUserId: string, candidate: any) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('ice-candidate', {
            from: userId,
            to: targetUserId,
            candidate: candidate,
        });
    });

    // Additional WebRTC events for better connection management
    socket.on('connection-request', (roomId: string, targetUserId: string) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('connection-request', {
            from: userId,
            to: targetUserId,
        });
    });

    socket.on('connection-accepted', (roomId: string, targetUserId: string) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('connection-accepted', {
            from: userId,
            to: targetUserId,
        });
    });

    socket.on('connection-rejected', (roomId: string, targetUserId: string) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('connection-rejected', {
            from: userId,
            to: targetUserId,
        });
    });

    socket.on('connection-closed', (roomId: string, targetUserId: string) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('connection-closed', {
            from: userId,
            to: targetUserId,
        });
    });

    // User status events
    socket.on('user-ready', (roomId: string) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('user-ready', userId);
    });

    socket.on('user-busy', (roomId: string) => {
        if (!rooms.has(roomId)) return;

        const userId = socket.data.userId;
        if (!userId) return;

        io.to(roomId).emit('user-busy', userId);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
        socket.emit('pong');
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        
        const userId = socket.data.userId;
        if (!userId) return;

        const roomId = usersRooms.get(userId);
        if (!roomId) return;

        // Remove user from all calls in this room
        if (roomCalls.has(roomId)) {
            const roomCallMap = roomCalls.get(roomId);
            if (roomCallMap) {
                for (const [callId, users] of roomCallMap.entries()) {
                    if (users.has(userId)) {
                        users.delete(userId);
                        // If no users left in the call, remove it
                        if (users.size === 0) {
                            roomCallMap.delete(callId);
                        }
                        io.to(roomId).emit('call-left', callId, userId);
                    }
                }
            }
        }

        // Remove user from call tracking
        userCurrentCall.delete(userId);

        rooms.get(roomId)?.delete(userId);
        usersRooms.delete(userId);
        socket.leave(roomId);
        io.to(roomId).emit('user-disconnected', userId);
    });
});

httpServer.listen(process.env.PORT || 3002, () => {
    console.log('Signal Server is running on port 3002');
});

