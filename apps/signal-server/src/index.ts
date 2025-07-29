import express from 'express';
import dotenv from 'dotenv';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
dotenv.config();

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    }),
);

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
    console.log(spacesCallsUsersMap)

    socket.on('create-call', (spaceId: string, userId: string) => {
        // Initialize space if it doesn't exist
        if (!spacesCallsUsersMap.has(spaceId)) {
            spacesCallsUsersMap.set(spaceId, new Map());
        }

        socket.data.userId = userId;

        const callId = uuidv4();
        console.log(userId)
        spacesCallsUsersMap.get(spaceId)?.set(callId, new Set([userId]));
        socket.join(callId); // join the call
        console.log(spacesCallsUsersMap.get(spaceId)?.get(callId))
        socket.emit('call-created', callId, spacesCallsUsersMap.get(spaceId)?.get(callId)); //send the callId and the users in the call to the user who created the call
    });

    socket.on('join-call', (spaceId: string, callId: string, proximityUserId: string) => {
        // socket.data.userId = userId;
        if (spacesCallsUsersMap.has(spaceId)) {
            const callsUsersMap = spacesCallsUsersMap.get(spaceId);
            if (callsUsersMap?.has(callId)) {
                callsUsersMap.get(callId)?.add(proximityUserId);
                socket.join(callId);
                socket.emit('call-joined', callId, callsUsersMap.get(callId)); //send the callId and the users in the call to the user who joined the call
                io.to(callId).emit('user-joined', proximityUserId); //send the joined user to other users in the call
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

    // New proximity call management events
    socket.on('join-proximity-call', (spaceId: string, callId: string, userId: string) => {
        console.log(`User ${userId} joining proximity call ${callId} in space ${spaceId}`);
        
        // Initialize space if it doesn't exist
        if (!spacesCallsUsersMap.has(spaceId)) {
            spacesCallsUsersMap.set(spaceId, new Map());
        }
        
        const callsUsersMap = spacesCallsUsersMap.get(spaceId);
        
        // Initialize call if it doesn't exist
        if (!callsUsersMap?.has(callId)) {
            callsUsersMap?.set(callId, new Set());
        }
        
        // Add user to call
        callsUsersMap?.get(callId)?.add(userId);
        socket.join(callId);
        socket.data.userId = userId;
        
        console.log(`User ${userId} successfully joined proximity call ${callId}`);
        console.log(`Users in call ${callId}:`, Array.from(callsUsersMap?.get(callId) || []));
        
        socket.emit('proximity-call-joined', callId, callsUsersMap?.get(callId));
        io.to(callId).emit('user-joined-proximity-call', userId);
    });

    socket.on('leave-proximity-call', (spaceId: string, callId: string, userId: string) => {
        console.log(`User ${userId} leaving proximity call ${callId} in space ${spaceId}`);
        
        if (spacesCallsUsersMap.has(spaceId)) {
            const callsUsersMap = spacesCallsUsersMap.get(spaceId);
            if (callsUsersMap?.has(callId)) {
                const usersInCall = callsUsersMap.get(callId);
                usersInCall?.delete(userId);
                socket.leave(callId);
                socket.emit('proximity-call-left', callId);
                
                // Send the remaining participants to all users in the call
                const remainingParticipants = Array.from(usersInCall || []);
                io.to(callId).emit('user-left-proximity-call', {
                    callId,
                    leftUserId: userId,
                    remainingParticipants
                });

                // Clean up empty calls
                if (usersInCall?.size === 0) {
                    callsUsersMap.delete(callId);
                    console.log(`Proximity call ${callId} removed from space ${spaceId} - no users remaining`);
                }

                if (callsUsersMap.size === 0) {
                    spacesCallsUsersMap.delete(spaceId);
                    console.log(`Space ${spaceId} removed - no calls remaining`);
                }
            } else {
                socket.emit('call-not-found', 'Proximity call not found with callId: ' + callId);
            }
        } else {
            socket.emit('space-not-found', 'Space not found with spaceId: ' + spaceId);
        }
    });

    //WEBRTC signalling events
    socket.on('offer', (spaceId: string, callId: string, fromUserId: string, toUserId: string, offer: any) => {
        console.log(`[Signal Server] Received offer from ${fromUserId} to ${toUserId} in call ${callId}`);
        socket.data.userId = fromUserId;
        if (spacesCallsUsersMap.has(spaceId)) {
            const callsUsersMap = spacesCallsUsersMap.get(spaceId);
            if (callsUsersMap?.has(callId)) {
                const usersInCall = callsUsersMap.get(callId);
                console.log(`[Signal Server] Users in call ${callId}:`, Array.from(usersInCall || []));
                if (usersInCall?.has(toUserId)) {
                    // broadcast the offer to all users in the call
                    console.log(`[Signal Server] Broadcasting offer to call ${callId}`);
                    io.to(callId).emit('offer', callId, fromUserId, toUserId, offer);
                } else {
                    console.log(`[Signal Server] User ${toUserId} not found in call ${callId}`);
                    socket.emit('user-not-found', 'User not found with userId: ' + toUserId);
                }
            } else {
                console.log(`[Signal Server] Call ${callId} not found in space ${spaceId}`);
                socket.emit('call-not-found', 'Call not found with callId: ' + callId);
            }
        } else {
            console.log(`[Signal Server] Space ${spaceId} not found`);
            socket.emit('space-not-found', 'Space not found with spaceId: ' + spaceId);
        }
    });

    socket.on('answer', (spaceId: string, callId: string, fromUserId: string, toUserId: string, answer: any) => {
        console.log(`[Signal Server] Received answer from ${fromUserId} to ${toUserId} in call ${callId}`);
        socket.data.userId = fromUserId;
        if (spacesCallsUsersMap.has(spaceId)) {
            const callsUsersMap = spacesCallsUsersMap.get(spaceId);
            if (callsUsersMap?.has(callId)) {
                const usersInCall = callsUsersMap.get(callId);
                console.log(`[Signal Server] Users in call ${callId}:`, Array.from(usersInCall || []));
                if (usersInCall?.has(toUserId)) {
                    // broadcast the answer to all users in the call
                    console.log(`[Signal Server] Broadcasting answer to call ${callId}`);
                    io.to(callId).emit('answer', callId, fromUserId, toUserId, answer);
                    console.log(`[Signal Server] Answer broadcasted successfully to call ${callId}`);
                } else {
                    console.log(`[Signal Server] User ${toUserId} not found in call ${callId}`);
                    socket.emit('user-not-found', 'User not found with userId: ' + toUserId);
                }
            } else {
                console.log(`[Signal Server] Call ${callId} not found in space ${spaceId}`);
                socket.emit('call-not-found', 'Call not found with callId: ' + callId);
            }
        } else {
            console.log(`[Signal Server] Space ${spaceId} not found`);
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

    // Handle audio toggling
    socket.on('audio-toggled', (spaceId: string, callId: string, userId: string, isEnabled: boolean) => {
        console.log(`[Signal Server] audio-toggled: user ${userId} in call ${callId} (space ${spaceId}) set audio to ${isEnabled}`);
        // Broadcast to all other users in the call
        socket.to(callId).emit('remote-audio-toggled', userId, isEnabled);
    });

    // Handle video toggling
    socket.on('video-toggled', (spaceId: string, callId: string, userId: string, isEnabled: boolean) => {
        console.log(`[Signal Server] video-toggled: user ${userId} in call ${callId} (space ${spaceId}) set video to ${isEnabled}`);
        // Broadcast to all other users in the call
        socket.to(callId).emit('remote-video-toggled', userId, isEnabled);
    });

    // Error events
    socket.on('call-not-found', (message: string) => {
        console.error('Call not found:', message);
    });
    socket.on('space-not-found', (message: string) => {
        console.error('Space not found:', message);
    });
    socket.on('user-not-found', (message: string) => {
        console.error('User not found:', message);
    });

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
                            console.log(
                                `User ${userId} removed from call ${callId} in space ${spaceId} due to disconnect`,
                            );

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

server.listen(process.env.PORT || 3002, () => {
    console.log('Server is running on port 3002');
});
