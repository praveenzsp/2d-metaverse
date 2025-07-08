import { useCallback, useRef, useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';

interface SpaceMember {
    id: string;
    stream?: MediaStream | null;
    username: string;
    avatarUrl: string;
    status?: 'ready' | 'busy' | 'connected' | 'rejected' | 'disconnected';
}

interface CurrentCall {
    spaceId: string;
    callId: string;
}

export const useWebRTC = (spaceId: string, userId: string) => {
    const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Call management state
    const [currentCall, setCurrentCall] = useState<CurrentCall | null>(null);
    const [callMembers, setCallMembers] = useState<string[]>([]);
    const [callError, setCallError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);

    const initializeSocket = () => {
        console.log('initializeSocket call reached');
        if (socketRef.current?.connected) return;

        socketRef.current = io(process.env.NEXT_PUBLIC_SIGNAL_SERVER_URL!);

        socketRef.current.on('connect', () => {
            console.log('connected to signal server');
            setIsConnected(true);
            setError(null);
        });

        socketRef.current.on('disconnect', () => {
            console.log('disconnected from signal server');
            setIsConnected(false);
            setError('Connection lost');
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('signal server error', error);
            setError('Connection error');
        });

        socketRef.current.on('space-members', (members: SpaceMember[]) => {
            console.log('space members', members);
            setSpaceMembers(members);
        });

        socketRef.current.on('user-joined', (newUserId: string) => {
            console.log(`${newUserId} joined the space ${spaceId}`);
            if (newUserId !== userId) {
                setSpaceMembers((prev) => [...prev, { id: newUserId, username: newUserId, avatarUrl: '' }]);
            }
        });

        socketRef.current.on('user-left', (leftUserId: string) => {
            console.log(`${leftUserId} left the space ${spaceId}`);
            setSpaceMembers((prev) => prev.filter((user) => user.id !== leftUserId));
        });

        //this user got a message from another user
        socketRef.current.on('message', (userId: string, message: string, timestamp: Date) => {
            console.log(`${userId} sent message: ${message} at ${timestamp}`);
        });

        //this user got an offer from another user
        socketRef.current.on(
            'offer',
            async ({
                from,
                to,
                offer,
            }: {
                from: string;
                to: string;
                offer: RTCSessionDescriptionInit;
            }) => {
                if (to !== userId) return;

                console.log(`${from} offered to ${to}`);
                try {
                    const pc = createPeerConnection(from);
                    await pc.setRemoteDescription(new RTCSessionDescription(offer!));

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    // Include callId in the answer event
                    if (currentCall) {
                        socketRef.current?.emit('answer', spaceId, currentCall.callId, userId, from, answer);
                    }
                } catch (error) {
                    console.error('Error setting remote description:', error);
                }
            },
        );

        //this user sent an offer, then got an answer from the other user
        socketRef.current.on(
            'answer',
            async ({
                from,
                to,
                answer,
            }: {
                from: string;
                to: string;
                answer: RTCSessionDescriptionInit;
            }) => {
                if (to !== userId) return;

                console.log(`${from} answered to ${to}`);
                try {
                    const pc = createPeerConnection(from);
                    await pc.setRemoteDescription(new RTCSessionDescription(answer!));
                } catch (error) {
                    console.error('Error setting remote description:', error);
                }
            },
        );

        socketRef.current.on(
            'ice-candidate',
            async ({
                from,
                to,
                candidate,
            }: {
                from: string;
                to: string;
                candidate: RTCIceCandidateInit;
            }) => {
                if (to !== userId) return;

                console.log(`${from} sent an ice candidate to ${to}`);
                try {
                    const pc = createPeerConnection(from);
                    if (pc && candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate!));
                    }
                } catch (error) {
                    console.error('Error adding ice candidate:', error);
                }
            },
        );

        socketRef.current.on('connection-request', (data: { from: string; to: string }) => {
            console.log(`Connection request from ${data.from} to ${data.to}`);
            // Auto-accept connection requests for now
            if (data.to === userId) {
                if (currentCall) {
                    socketRef.current?.emit('connection-accepted', spaceId, currentCall.callId, userId, data.from);
                }
            }
        });

        socketRef.current.on('connection-accepted', (data: { from: string; to: string }) => {
            console.log(`Connection accepted from ${data.from} to ${data.to}`);
            // Update participant status to connected
            setSpaceMembers((prev) => prev.map((p) => (p.id === data.from ? { ...p, status: 'connected' } : p)));
        });

        socketRef.current.on('connection-rejected', (data: { from: string; to: string }) => {
            console.log(`Connection rejected from ${data.from} to ${data.to}`);
            // Update participant status to rejected
            setSpaceMembers((prev) => prev.map((p) => (p.id === data.from ? { ...p, status: 'rejected' } : p)));
        });

        socketRef.current.on('connection-closed', (data: { from: string; to: string }) => {
            console.log(`Connection closed from ${data.from} to ${data.to}`);
            // Close peer connection and update status
            const pc = peerConnectionsRef.current.get(data.from);
            if (pc) {
                pc.close();
                peerConnectionsRef.current.delete(data.from);
            }
            setSpaceMembers((prev) =>
                prev.map((p) => (p.id === data.from ? { ...p, status: 'disconnected', stream: null } : p)),
            );
        });

        socketRef.current.on('user-ready', (userId: string) => {
            console.log(`User ${userId} is ready`);
            // Update participant status to ready
            setSpaceMembers((prev) => prev.map((p) => (p.id === userId ? { ...p, status: 'ready' } : p)));
        });

        socketRef.current.on('user-busy', (userId: string) => {
            console.log(`User ${userId} is busy`);
            // Update participant status to busy
            setSpaceMembers((prev) => prev.map((p) => (p.id === userId ? { ...p, status: 'busy' } : p)));
        });

        socketRef.current.on('pong', () => {
            // Keep track of connection health
            console.log('Received pong from server');
        });

        socketRef.current.on('user-disconnected', (userId: string) => {
            console.log(`User ${userId} disconnected`);
            // Clean up peer connection and remove user
            const pc = peerConnectionsRef.current.get(userId);
            if (pc) {
                pc.close();
                peerConnectionsRef.current.delete(userId);
            }
            setSpaceMembers((prev) => prev.filter((p) => p.id !== userId));
        });

        // Call management events
        socketRef.current.on('call-created', (callId: string, participants: string[]) => {
            console.log(`Call created: ${callId} with participants:`, participants);
            setCurrentCall({ spaceId, callId });
            setCallMembers(participants);
        });

        socketRef.current.on('call-members', (members: string[]) => {
            console.log(`Call members:`, members);
            setCallMembers(members);
        });

        socketRef.current.on('call-joined', (callId: string, participantId: string) => {
            console.log(`User ${participantId} joined call ${callId}`);
            setCallMembers((prev) => [...prev, participantId]);
        });

        socketRef.current.on('call-left', (callId: string, participantId: string) => {
            console.log(`User ${participantId} left call ${callId}`);
            setCallMembers((prev) => prev.filter(p => p !== participantId));
            
            // If this user left the call, clear current call
            if (participantId === userId) {
                setCurrentCall(null);
            }
        });

        socketRef.current.on('call-join-error', (errorMessage: string) => {
            console.error('Call join error:', errorMessage);
            setCallError(errorMessage);
        });

        socketRef.current.on('my-current-call', (callInfo: CurrentCall | null) => {
            console.log('My current call:', callInfo);
            setCurrentCall(callInfo);
        });

        return socketRef.current;
    };

    const createPeerConnection = (remoteUserId: string) => {
        console.log('creating peer connection for', remoteUserId);
        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302',
                },
                {
                    urls: 'turn:turn.bistri.com:80',
                },
            ],
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        //when the remote user sends a stream, we add it to the spaceMembers list
        pc.ontrack = (event: RTCTrackEvent) => {
            console.log('Received remote stream from', remoteUserId);
            setSpaceMembers((prev) => {
                return prev.map((p) => {
                    return p.id === remoteUserId ? { ...p, stream: event.streams[0] } : p;
                });
            });
        };

        //when the remote user sends an ice candidate, we send it to the server
        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate && currentCall) {
                socketRef.current?.emit('ice-candidate', spaceId, currentCall.callId, userId, remoteUserId, event.candidate);
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state changed to', pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                console.log('Connection failed or disconnected, closing peer connection');
                pc.close();
                setSpaceMembers((prev) => prev.filter((p) => p.id !== remoteUserId));
                peerConnectionsRef.current.delete(remoteUserId);
            }
        };
        return pc;
    };

    const getUserMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            localStreamRef.current = stream;
            setLocalStream(stream);
            setError(null);
        } catch (error) {
            console.error('error getting user media', error);
            setError('Failed to access camera and microphone');
        }
    };

    const joinSpace = async () => {
        try {
            const socket = initializeSocket();
            console.log('initializeSocket called');

            await getUserMedia();

            socket?.emit('join-space', spaceId, userId);

            // Get current call status after joining space
            setTimeout(() => {
                getCurrentCallStatus();
            }, 1000);

        } catch (error) {
            console.error('error joining space', error);
            setError('Failed to join space');
        }
    };

    const leaveSpace = useCallback(() => {
        try {
            // Leave current call if in one
            if (currentCall) {
                socketRef.current?.emit('leave-call', spaceId, currentCall.callId, userId);
            }

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    track.stop();
                });
                localStreamRef.current = null;
                setLocalStream(null);
            }

            peerConnectionsRef.current.forEach((pc) => pc.close());
            peerConnectionsRef.current.clear();

            socketRef.current?.emit('leave-space', spaceId, userId);
            socketRef.current = null;
            setSpaceMembers([]);
            setIsConnected(false);
            setError(null);
            
            // Clear call-related state
            setCurrentCall(null);
            setCallMembers([]);
            setCallError(null);
        } catch (error) {
            console.error('error leaving space', error);
            setError('Failed to leave space');
        }
    }, [spaceId, userId, currentCall]);

    const toggleAudio = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setAudioEnabled(!audioEnabled);
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setVideoEnabled(!videoEnabled);
        }
    };

    // Call management functions
    const createCall = useCallback(() => {
        console.log('[WebRTC] createCall called');
        if (!socketRef.current?.connected) {
            console.log('[WebRTC] createCall not connected to server');
            setCallError('Not connected to server');
            return;
        }
        
        socketRef.current.emit('create-call', spaceId, userId);
        console.log('create-call emitted');
        setCallError(null);
    }, [spaceId, userId]);

    const joinCall = useCallback((callId: string) => {
        console.log('[WebRTC] joinCall called');
        if (!socketRef.current?.connected) {
            setCallError('Not connected to server');
            return;
        }

        if (currentCall) {
            setCallError('Already in a call');
            return;
        }

        socketRef.current.emit('join-call', spaceId, callId, userId);
        setCallError(null);
    }, [spaceId, userId, currentCall]);

    const leaveCall = useCallback(() => {
        console.log('[WebRTC] leaveCall called');
        if (!socketRef.current?.connected || !currentCall) {
            return;
        }

        socketRef.current.emit('leave-call', spaceId, currentCall.callId, userId);
        setCurrentCall(null);
        setCallMembers([]);
        setCallError(null);
    }, [spaceId, userId, currentCall]);

    const getCurrentCallStatus = useCallback(() => {
        if (!socketRef.current?.connected) {
            return;
        }

        socketRef.current.emit('get-my-current-call', userId);
    }, [userId]);

    useEffect(() => {
        return () => {
            leaveSpace();
        };
    }, [leaveSpace]);

    return {
        spaceMembers,
        localStream,
        isConnected,
        error,
        audioEnabled,
        videoEnabled,
        joinSpace,
        leaveSpace,
        toggleAudio,
        toggleVideo,
        // Call management
        currentCall,
        callMembers,
        callError,
        createCall,
        joinCall,
        leaveCall,
        getCurrentCallStatus,
    };
};
