import express from 'express';
import dotenv from 'dotenv';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

const app = express();

app.use(express.json());

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// this tells us in which space in which call which user is present
const spacesCallsUsersMap = new Map<string, Map<string, Set<string>>>();

io.on('connection', (socket: Socket) => {
    console.log('A new user connected to signal server');
	

    socket.on('create-call', (spaceId: string, userId: string) => {
        // Initialize space if it doesn't exist
        if (!spacesCallsUsersMap.has(spaceId)) {
            spacesCallsUsersMap.set(spaceId, new Map());
        }

		socket.data.userId = userId;

        const callId = uuidv4();
        spacesCallsUsersMap.get(spaceId)?.set(callId, new Set([userId]));
        socket.join(callId); // join the call
        socket.emit('call-created', callId, spacesCallsUsersMap.get(spaceId)?.get(callId)); //send the callId and the users in the call to the user who created the call
    });

    socket.on('join-call', (spaceId: string, callId: string, userId: string) => {
		socket.data.userId = userId;
        if (spacesCallsUsersMap.has(spaceId)) {
            const callsUsersMap = spacesCallsUsersMap.get(spaceId);
            if (callsUsersMap?.has(callId)) {
                callsUsersMap.get(callId)?.add(userId);
                socket.join(callId);
                socket.emit('call-joined', callId, callsUsersMap.get(callId)); //send the callId and the users in the call to the user who joined the call
                io.to(callId).emit('user-joined', userId); //send the joined user to other users in the call
            } else {
                socket.emit('call-not-found', 'Call not found with callId: ' + callId);
            }
        } else {
            socket.emit('space-not-found', 'Space not found with spaceId: ' + spaceId);
        }
    });

    socket.on('leave-call', (spaceId: string, callId: string, userId: string) => {
        if (spacesCallsUsersMap.has(spaceId)) {
            const callsUsersMap = spacesCallsUsersMap.get(spaceId);
            if (callsUsersMap?.has(callId)) {
                const usersInCall = callsUsersMap.get(callId);
                usersInCall?.delete(userId);
                socket.leave(callId);
                socket.emit('call-left', callId);
                io.to(callId).emit('user-left', userId); //send the left user to other users in the call

                // Clean up empty calls to prevent memory leaks
                if (usersInCall?.size === 0) {
                    callsUsersMap.delete(callId);
                    console.log(`Call ${callId} removed from space ${spaceId} - no users remaining`);
                }

                // Clean up empty spaces to prevent memory leaks
                if (callsUsersMap.size === 0) {
                    spacesCallsUsersMap.delete(spaceId);
                    console.log(`Space ${spaceId} removed - no calls remaining`);
                }
            } else {
                socket.emit('call-not-found', 'Call not found with callId: ' + callId);
            }
        } else {
            socket.emit('space-not-found', 'Space not found with spaceId: ' + spaceId);
        }
    });

    //WEBRTC signalling events
    socket.on('offer', (spaceId: string, callId: string, fromUserId: string, toUserId: string, offer: any) => {
		socket.data.userId = fromUserId;
        if (spacesCallsUsersMap.has(spaceId)) {
            const callsUsersMap = spacesCallsUsersMap.get(spaceId);
            if (callsUsersMap?.has(callId)) {
                const usersInCall = callsUsersMap.get(callId);
                if (usersInCall?.has(toUserId)) {
                    // broadcast the offer to all users in the call
                    io.to(callId).emit('offer', callId, fromUserId, toUserId, offer);
                } else {
                    socket.emit('user-not-found', 'User not found with userId: ' + toUserId);
                }
            } else {
                socket.emit('call-not-found', 'Call not found with callId: ' + callId);
            }
        } else {
            socket.emit('space-not-found', 'Space not found with spaceId: ' + spaceId);
        }
    });

    socket.on('answer', (spaceId: string, callId: string, fromUserId: string, toUserId: string, answer: any) => {
		socket.data.userId = fromUserId;
        if (spacesCallsUsersMap.has(spaceId)) {
            const callsUsersMap = spacesCallsUsersMap.get(spaceId);
            if (callsUsersMap?.has(callId)) {
                const usersInCall = callsUsersMap.get(callId);
                if (usersInCall?.has(toUserId)) {
                    // broadcast the answer to all users in the call
                    io.to(callId).emit('answer', callId, fromUserId, toUserId, answer);
                } else {
                    socket.emit('user-not-found', 'User not found with userId: ' + toUserId);
                }
            } else {
                socket.emit('call-not-found', 'Call not found with callId: ' + callId);
            }
        } else {
            socket.emit('space-not-found', 'Space not found with spaceId: ' + spaceId);
        }
    });

    socket.on(
        'ice-candidate',
        (spaceId: string, callId: string, fromUserId: string, toUserId: string, candidate: any) => {
			socket.data.userId = fromUserId;
            if (spacesCallsUsersMap.has(spaceId)) {
                const callsUsersMap = spacesCallsUsersMap.get(spaceId);
                if (callsUsersMap?.has(callId)) {
                    const usersInCall = callsUsersMap.get(callId);
                    if (usersInCall?.has(toUserId)) {
                        // broadcast the ice candidate to all users in the call
                        io.to(callId).emit('ice-candidate', callId, fromUserId, toUserId, candidate);
                    } else {
                        socket.emit('user-not-found', 'User not found with userId: ' + toUserId);
                    }
                } else {
                    socket.emit('call-not-found', 'Call not found with callId: ' + callId);
                }
            } else {
                socket.emit('space-not-found', 'Space not found with spaceId: ' + spaceId);
            }
        },
    );

    // Handle socket disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected from signal server');
        // on disconnect, make sure to remove the user from all calls they were in
        const userId = socket.data.userId;
        
        if (userId) {
            for (const spaceId of spacesCallsUsersMap.keys()) {
                const callsUsersMap = spacesCallsUsersMap.get(spaceId);
                if (callsUsersMap) {
                    for (const callId of callsUsersMap.keys()) {
                        const usersInCall = callsUsersMap.get(callId);
                        if (usersInCall?.has(userId)) {
                            usersInCall.delete(userId);
                            // Notify other users about the disconnect
                            io.to(callId).emit('user-left', userId);
                            console.log(`User ${userId} removed from call ${callId} in space ${spaceId} due to disconnect`);
                            
                            // Clean up empty calls to prevent memory leaks
                            if (usersInCall.size === 0) {
                                callsUsersMap.delete(callId);
                                console.log(`Call ${callId} removed from space ${spaceId} - no users remaining`);
                            }
                            
                            // Clean up empty spaces to prevent memory leaks
                            if (callsUsersMap.size === 0) {
                                spacesCallsUsersMap.delete(spaceId);
                                console.log(`Space ${spaceId} removed - no calls remaining`);
                            }
                        }
                    }
                }
            }
        }
    });
});

app.get('/health', (req, res) => {
    res.send('Welcome to signal server');
});

app.listen(process.env.PORT || 3002, () => {
    console.log('Server is running on port 3002');
});
