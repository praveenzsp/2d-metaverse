// import { CallParticipant } from './useWebRTC';
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useRef, useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';

export interface CallParticipant {
    id: string;
    stream?: MediaStream | null;
    // status: 'busy' | 'free'
}

export interface ProximityUser {
    userId: string;
    x: number;
    y: number;
}

export interface CallInfo {
    callId: string;
    participants: string[];
    spaceId: string;
    createdAt: Date;
    creatorId: string;
}

export const useWebRTC = (spaceId: string, userId: string) => {
    const [callParticipants, setCallParticipants] = useState<CallParticipant[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Call management state
    const [currentCallId, setCurrentCallId] = useState('');
    const [callError, setCallError] = useState<string | null>(null);
    const [proximityUsers, setProximityUsers] = useState<ProximityUser[]>([]);
    const [currentCallInfo, setCurrentCallInfo] = useState<CallInfo | null>(null);

    // Refs for WebRTC state
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const socketRef = useRef<Socket | null>(null);
    const userIdRef = useRef<string>(userId);
    const currentCallIdRef = useRef<string>(''); // Add ref to track current call ID

    // Update userIdRef when userId changes
    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    const initializeSocket = () => {
        if (socketRef.current?.connected) {
            console.log('[WebRTC] Socket already connected');
            return socketRef.current;
        }

        console.log('[WebRTC] Initializing socket connection to:', process.env.NEXT_PUBLIC_SIGNAL_SERVER_URL);
        socketRef.current = io(process.env.NEXT_PUBLIC_SIGNAL_SERVER_URL!);

        socketRef.current.on('connect', () => {
            console.log('[WebRTC] Connected to signal server');
            setIsConnected(true);
            setError(null);
        });

        socketRef.current.on('disconnect', () => {
            setIsConnected(false);
            setError('Connection lost');
        });

        // Proximity call events
        socketRef.current.on('proximity-call-created', (payload: { callId: string; participants: string[] }) => {
            console.log('[WebRTC] Proximity call created event received:', payload);
            setCurrentCallId(payload.callId);
            // Include local user in participants list
            const allParticipants = [...payload.participants];
            if (!allParticipants.includes(userId)) {
                allParticipants.push(userId);
            }
            console.log('[WebRTC] All participants after adding local user:', allParticipants);
            setCallParticipants(allParticipants.map((id) => ({ 
                id,
                stream: id === userId ? localStreamRef.current : null
            })));
            // Automatically join the proximity call
            joinProximityCall(payload.callId, userId);
        });

        socketRef.current.on('proximity-call-updated', (payload: { callId: string; participants: string[] }) => {
            console.log('[WebRTC] Proximity call updated:', payload);
            setCurrentCallId(payload.callId);
            // Include local user in participants list
            const allParticipants = [...payload.participants];
            if (!allParticipants.includes(userId)) {
                allParticipants.push(userId);
            }
            setCallParticipants(allParticipants.map((id) => ({ 
                id,
                stream: id === userId ? localStreamRef.current : null
            })));
            
            // Create peer connections for new remote users
            allParticipants.forEach((participantId) => {
                if (participantId !== userId && !peerConnectionsRef.current.has(participantId)) {
                    console.log('[WebRTC] Creating peer connection for new remote user:', participantId);
                    const pc = createPeerConnection(participantId);
                    peerConnectionsRef.current.set(participantId, pc);
                    
                    // Create and send offer to remote user
                    pc.createOffer().then((offer) => {
                        pc.setLocalDescription(offer);
                        socketRef.current?.emit('offer', spaceId, payload.callId, userId, participantId, offer);
                    }).catch((error) => {
                        console.error('[WebRTC] Failed to create offer for new user', participantId, error);
                    });
                }
            });
        });

        socketRef.current.on('proximity-calls-merged', (payload: { callId: string; participants: string[] }) => {
            console.log('[WebRTC] Proximity calls merged:', payload);
            setCurrentCallId(payload.callId);
            // Include local user in participants list
            const allParticipants = [...payload.participants];
            if (!allParticipants.includes(userId)) {
                allParticipants.push(userId);
            }
            setCallParticipants(allParticipants.map((id) => ({ 
                id,
                stream: id === userId ? localStreamRef.current : null
            })));
        });

        socketRef.current.on('user-left-proximity-call', (payload: { callId: string; leftUserId: string; remainingParticipants: string[] }) => {
            console.log('[WebRTC] User left proximity call:', payload);
            // Include local user in participants list if still in call
            const allParticipants = [...payload.remainingParticipants];
            if (!allParticipants.includes(userId)) {
                allParticipants.push(userId);
            }
            setCallParticipants(allParticipants.map((id) => ({ 
                id,
                stream: id === userId ? localStreamRef.current : null
            })));
            
            // If current user left, clear call state
            if (payload.leftUserId === userId) {
                setCurrentCallId('');
                setCurrentCallInfo(null);
            }
        });

        // Legacy call events (for backward compatibility)
        socketRef.current.on('call-joined', (callId: string, participants: Set<string>) => {
            setCallParticipants(Array.from(participants).map((userId) => ({ id: userId })));
        });

        socketRef.current.on('call-left', (callId: string) => {
            console.log(`${userId} left this call ${callId}`);
            setCurrentCallId('');
            setCallParticipants([]);
            setCurrentCallInfo(null);
        });

        socketRef.current.on('user-joined', (joinedUserId: string) => {
            //this is the userId of the new user who joined
            setCallParticipants((prev) => [...prev, { id: joinedUserId }]);
        });

        socketRef.current.on('user-left', (leftUserId: string) => {
            // this is the userId of the user who left
            setCallParticipants((prev) => prev.filter((p) => p.id !== leftUserId));
        });

        // Call info events
        socketRef.current.on('call-info', (callInfo: CallInfo | null) => {
            console.log('Received call info:', callInfo);
            setCurrentCallInfo(callInfo);
            if (callInfo) {
                setCurrentCallId(callInfo.callId);
                // Include local user in participants list
                const allParticipants = [...callInfo.participants];
                if (!allParticipants.includes(userId)) {
                    allParticipants.push(userId);
                }
                setCallParticipants(allParticipants.map((id) => ({ 
                    id,
                    stream: id === userId ? localStreamRef.current : null
                })));
            }
        });

        // WebRTC signaling events
        socketRef.current.on(
            'offer',
            async (callId: string, fromUserId: string, toUserId: string, offer: RTCSessionDescriptionInit) => {
                console.log(`[WebRTC] Received offer from ${fromUserId} to ${toUserId} in call ${callId}`);
                console.log(`[WebRTC] My userId: ${userIdRef.current}, toUserId: ${toUserId}, should process: ${toUserId === userIdRef.current}`);
                if (toUserId !== userIdRef.current) {
                    console.log(`[WebRTC] Offer not for me (${userIdRef.current}), ignoring`);
                    return;
                }
                try {
                    const pc = createPeerConnection(fromUserId);
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    peerConnectionsRef.current.set(fromUserId, pc);

                    console.log(`[WebRTC] Creating answer for offer from ${fromUserId}`);
                    const answer = await pc.createAnswer();
                    console.log(`[WebRTC] Answer created successfully for ${fromUserId}:`, answer);
                    pc.setLocalDescription(answer);

                    if (currentCallIdRef.current) {
                        console.log(`[WebRTC] Sending answer to ${fromUserId} in call ${currentCallIdRef.current}`);
                        socketRef.current?.emit('answer', spaceId, currentCallIdRef.current, userIdRef.current, fromUserId, answer);
                        console.log(`[WebRTC] Answer sent successfully to ${fromUserId}`);
                    } else {
                        console.error(`[WebRTC] No current call ID when trying to send answer to ${fromUserId}`);
                    }
                } catch (err) {
                    console.error('Failed to handle offer', err);
                    setError('Failed to handle offer');
                }
            },
        );

        socketRef.current.on(
            'answer',
            (_callId: string, fromUserId: string, toUserId: string, answer: RTCSessionDescriptionInit) => {
                console.log(`[WebRTC] Received answer from ${fromUserId} to ${toUserId}`);
                console.log(`[WebRTC] My userId: ${userIdRef.current}, toUserId: ${toUserId}, should process: ${toUserId === userIdRef.current}`);
                if (toUserId !== userIdRef.current) {
                    console.log(`[WebRTC] Answer not for me (${userIdRef.current}), ignoring`);
                    return;
                }
                console.log(`[WebRTC] Processing answer from ${fromUserId}`);
                try {
                    const pc = peerConnectionsRef.current.get(fromUserId); // use existing connection
                    if (!pc) {
                        console.warn(`[WebRTC] No peer connection found for user ${fromUserId} to handle answer`);
                        return;
                    }

                    console.log(`[WebRTC] Setting remote description (answer) from ${fromUserId}`);
                    pc.setRemoteDescription(new RTCSessionDescription(answer));
                    console.log(`[WebRTC] Successfully set remote description (answer) from ${fromUserId}`);
                    // console.log(`[WebRTC] Set remote description (answer) from ${fromUserId}`);
                } catch (error) {
                    console.error(`[WebRTC] Failed to set remote description from ${fromUserId}:`, error);
                    setError('Failed to set remote description from peer');
                }
            },
        );

        socketRef.current.on(
            'ice-candidate',
            (_callId: string, fromUserId: string, toUserId: string, candidate: RTCIceCandidateInit) => {
                console.log(`[WebRTC] Received ICE candidate from ${fromUserId} to ${toUserId}`);
                if (toUserId !== userIdRef.current) {
                    console.log(`[WebRTC] ICE candidate not for me (${userIdRef.current}), ignoring`);
                    return;
                }
                try {
                    const pc = peerConnectionsRef.current.get(fromUserId); // ✅ Use existing connection
                    if (pc && candidate) {
                        pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                } catch (err) {
                    console.error('Error adding received ICE candidate:', err);
                }
            },
        );

        // Error events
        socketRef.current.on('call-not-found', (message: string) => {
            setCallError(message);
        });
        socketRef.current.on('space-not-found', (message: string) => {
            setError(message);
        });
        socketRef.current.on('user-not-found', (message: string) => {
            setError(message);
        });

        return socketRef.current;
    };

    const createPeerConnection = (remoteUserId: string) => {
        // console.log('creating peer connection for', remoteUserId);
        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302',
                },
                // Removed TURN server that requires credentials
                // You can add a proper TURN server with credentials if needed
            ],
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        //when the remote user sends a stream, we add it to the callParticipants list
        pc.ontrack = (event: RTCTrackEvent) => {
            console.log('[WebRTC] Received remote stream from', remoteUserId, event.streams[0]);
            if (event.streams[0]) {
                const tracks = event.streams[0].getTracks();
                const videoTracks = event.streams[0].getVideoTracks();
                const audioTracks = event.streams[0].getAudioTracks();
                console.log('[WebRTC] Remote stream tracks:', tracks);
                console.log('[WebRTC] Remote stream video tracks:', videoTracks);
                console.log('[WebRTC] Remote stream audio tracks:', audioTracks);
                if (videoTracks.length === 0) {
                    console.warn('[WebRTC] No video tracks in remote stream for', remoteUserId);
                } else {
                    videoTracks.forEach((track, idx) => {
                        console.log(`[WebRTC] Video track ${idx} enabled:`, track.enabled, track);
                        if (!track.enabled) {
                            console.warn(`[WebRTC] Video track ${idx} is disabled for`, remoteUserId);
                        }
                    });
                }
            } else {
                console.warn('[WebRTC] No remote stream object for', remoteUserId);
            }
            setCallParticipants((prev) => {
                const exists = prev.some((p) => p.id === remoteUserId);
                if (!exists) {
                    console.log('[WebRTC] Adding new remote participant with stream', remoteUserId, event.streams[0]);
                    return [...prev, { id: remoteUserId, stream: event.streams[0] }];
                }
                return prev.map((p) => {
                    return p.id === remoteUserId ? { ...p, stream: event.streams[0] } : p;
                });
            });
        };

        //when the remote user sends an ice candidate, we send it to the server
        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate && currentCallIdRef.current) {
                socketRef.current?.emit('ice-candidate', spaceId, currentCallIdRef.current, userId, remoteUserId, event.candidate);
            }
        };

        pc.onconnectionstatechange = () => {
            // console.log('Connection state changed to', pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                // console.log('Connection failed or disconnected, closing peer connection');
                pc.close();
                setCallParticipants((prev) => prev.filter((p) => p.id !== remoteUserId));
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
            // Ensure local participant has stream
            setCallParticipants((prev) => {
                const exists = prev.some((p) => p.id === userId);
                if (!exists) {
                    console.log('[WebRTC] Adding local participant with stream', userId, stream);
                    return [...prev, { id: userId, stream }];
                } else {
                    return prev.map((p) =>
                        p.id === userId ? { ...p, stream } : p
                    );
                }
            });
            console.log('[WebRTC] Local stream set for user', userId, stream);
        } catch (error) {
            console.error('error getting user media', error);
            setError('Failed to access camera and microphone');
        }
    };

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

    // Proximity-based call management functions

    /**
     * Handle proximity updates from the WebSocket server
     */
    const handleProximityUpdate = useCallback((proximityUsers: ProximityUser[]) => {
        console.log('[WebRTC] Handling proximity update:', proximityUsers);
        setProximityUsers(proximityUsers);
        
        // Ensure socket is initialized
        if (!socketRef.current?.connected) {
            console.log('[WebRTC] Socket not connected, initializing...');
            initializeSocket();
        }
        
        // The WebSocket server will handle the proximity call logic automatically
        // We just need to ensure we have media access when calls are created
        if (proximityUsers.length > 0 && !localStreamRef.current) {
            getUserMedia();
        }
    }, []);

    /**
     * Join a proximity call automatically
     */
    const joinProximityCall = useCallback(async (callId: string, participantId: string, participants?: string[]) => {
        console.log('[WebRTC] joinProximityCall called with:', callId, participantId);
        try {
            if (!socketRef.current?.connected) {
                console.log('[WebRTC] Socket not connected, initializing...');
                const socket = initializeSocket();
                socketRef.current = socket!;
            }
            
            // Ensure we have media access
            if (!localStreamRef.current) {
                console.log('[WebRTC] No local stream, getting user media...');
                await getUserMedia();
            }

            if (!socketRef.current?.connected) {
                console.log('[WebRTC] Still not connected to server');
                setCallError('Not connected to server');
                return;
            }

            console.log(`[WebRTC] Joining proximity call ${callId} as ${participantId}`);
            socketRef.current?.emit('join-proximity-call', spaceId, callId, participantId);
            
            // Set the call ID immediately in both state and ref
            setCurrentCallId(callId);
            currentCallIdRef.current = callId;
            
            // Set participants from server if provided, otherwise ensure local user is in list
            if (participants && participants.length > 0) {
                console.log('[WebRTC] Setting participants from server:', participants);
                const allParticipants = [...participants];
                if (!allParticipants.includes(userId)) {
                    allParticipants.push(userId);
                }
                setCallParticipants(allParticipants.map((id) => ({ 
                    id,
                    stream: id === userId ? localStreamRef.current : null
                })));
                
                // Create peer connections for remote users
                allParticipants.forEach((participantId) => {
                    if (participantId !== userId && !peerConnectionsRef.current.has(participantId)) {
                        console.log('[WebRTC] Creating peer connection for remote user:', participantId);
                        const pc = createPeerConnection(participantId);
                        peerConnectionsRef.current.set(participantId, pc);
                        
                        // Create and send offer to remote user
                        console.log('[WebRTC] Creating offer for remote user:', participantId);
                        pc.createOffer().then((offer) => {
                            console.log('[WebRTC] Offer created successfully for', participantId, offer);
                            pc.setLocalDescription(offer).then(() => {
                                console.log('[WebRTC] Local description set, sending offer to signal server');
                                socketRef.current?.emit('offer', spaceId, callId, userId, participantId, offer);
                            }).catch((error) => {
                                console.error('[WebRTC] Failed to set local description for', participantId, error);
                            });
                        }).catch((error) => {
                            console.error('[WebRTC] Failed to create offer for', participantId, error);
                        });
                    }
                });
            } else {
                // Fallback: ensure local user is in participants list
                setCallParticipants((prev) => {
                    const hasLocalUser = prev.some(p => p.id === userId);
                    if (!hasLocalUser) {
                        console.log('[WebRTC] Adding local user to participants list');
                        return [...prev, { id: userId, stream: localStreamRef.current }];
                    }
                    return prev;
                });
            }
            
            setCallError(null);
        } catch (error) {
            console.error('[WebRTC] Error joining proximity call:', error);
            setError('Failed to join proximity call');
        }
    }, [spaceId, userId]);

    /**
     * Leave current proximity call
     */
    const leaveProximityCall = useCallback(() => {
        console.log('Leaving proximity call:', currentCallId);
        try {
            if (currentCallId) {
                socketRef.current?.emit('leave-proximity-call', spaceId, currentCallId, userId);
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

            setCallParticipants([]);
            setCurrentCallId('');
            currentCallIdRef.current = ''; // Clear the ref as well
            setCurrentCallInfo(null);
            setCallError(null);
        } catch (error) {
            console.error('error leaving proximity call', error);
            setError('Failed to leave proximity call');
        }
    }, [spaceId, userId, currentCallId]);

    // Legacy call management functions (for backward compatibility)
    // Create a new call and return the call ID
    const createCall = useCallback(async () => {
        try {
            if (!socketRef.current?.connected) {
                const socket = initializeSocket();
                socketRef.current = socket!;
            }
            await getUserMedia();

            return new Promise<string>((resolve, reject) => {
                if (!socketRef.current?.connected) {
                    reject(new Error('Not connected to server'));
                    return;
                }

                socketRef.current.on('call-created', (callId: string, participants: Set<string>) => {
                    setCurrentCallId(callId);
                    setCallParticipants(Array.from(participants).map((id) => ({ id })));
                    // add current user to participants list
                    setCallParticipants((prev) => [...prev, { id: userId }]);
                    resolve(callId);
                });

                socketRef.current.emit('create-call', spaceId, userId);
            });
        } catch (error) {
            console.error('Error creating call:', error);
            setError('Failed to create call');
            return null;
        }
    }, [spaceId, userId]);

    // this can be used to make any user join a specific call
    const joinCall = useCallback(
        async (callId: string, proximityUserId: string) => {
            try {
                if (!socketRef.current?.connected) {
                    const socket = initializeSocket();
                    socketRef.current = socket!;
                }
                await getUserMedia();
                if (!socketRef.current?.connected) {
                    setCallError('Not connected to server');
                    return;
                }

                if (currentCallId) {
                    setCallError('Already in a call');
                    return;
                }

                socketRef.current?.emit('join-call', spaceId, callId, proximityUserId);
                setCallError(null);
            } catch (error) {
                console.error('error joining call', error);
                setError('Failed to join call');
            }
        },
        [spaceId, userId, currentCallId],
    );

    // Leave current call and clean up
    // this is used for current user, not for other users
    const leaveCall = useCallback(() => {
        console.log('leave call called', currentCallId, spaceId, userId);
        try {
            if(!currentCallId) return;
            // Leave current call if in one
            if (currentCallId) {
                socketRef.current?.emit('leave-call', spaceId, currentCallId, userId);
                console.log(`${userId} left call ${currentCallId}`);
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

            socketRef.current?.disconnect();
            socketRef.current = null;
            setCallParticipants([]);
            setIsConnected(false);
            setError(null);

            // Clear call-related state
            setCurrentCallId('');
            setCallError(null);
            setCurrentCallInfo(null);
        } catch (error) {
            console.error('error leaving space', error);
            setError('Failed to leave space');
        }
    }, [spaceId, userId, currentCallId]);

    const getCurrentCallStatus = useCallback(() => {
        if (!socketRef.current?.connected) {
            return;
        }

        socketRef.current.emit('get-my-current-call', userId);
    }, [userId]);

    // Ensure local user is always included in participants when in a call
    useEffect(() => {
        if (currentCallId && callParticipants.length > 0) {
            const hasLocalUser = callParticipants.some(p => p.id === userId);
            if (!hasLocalUser) {
                console.log('[WebRTC] Adding local user to participants list');
                setCallParticipants(prev => [...prev, { 
                    id: userId, 
                    stream: localStreamRef.current 
                }]);
            }
        }
    }, [currentCallId, callParticipants.length, userId]);

    return {
        localStream,
        isConnected,
        error,
        audioEnabled,
        videoEnabled,
        toggleAudio,
        toggleVideo,
        // Call management
        callParticipants,
        currentCallId,
        setCurrentCallId,
        callError,
        createCall,
        joinCall,
        leaveCall,
        getCurrentCallStatus,
        // Proximity-based call management
        proximityUsers,
        currentCallInfo,
        handleProximityUpdate,
        joinProximityCall,
        leaveProximityCall,
    };
};
