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

        // Notify others in the room about the new user
        io.to(roomId).emit('user-joined', userId);
    });

    socket.on('leave-room', (roomId: string, userId: string) => {
        console.log(`User ${userId} leaving room ${roomId}`);
        
        if (!rooms.has(roomId)) return;

        rooms.get(roomId)?.delete(userId);
        usersRooms.delete(userId);
        socket.leave(roomId);

        // Notify others in the room about the user leaving
        io.to(roomId).emit('user-left', userId);
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

        rooms.get(roomId)?.delete(userId);
        usersRooms.delete(userId);
        socket.leave(roomId);
        io.to(roomId).emit('user-disconnected', userId);
    });
});

httpServer.listen(process.env.PORT || 3002, () => {
    console.log('Server is running on port 3002');
});

