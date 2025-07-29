
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useRef, useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';

export interface CallParticipant {
    id: string;
    stream?: MediaStream | null;
    status: 'busy' | 'free'; 
    username: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
}

export interface ProximityUser {
    userId: string;
    username: string;
    x: number;
    y: number;
}

export interface CallInfo {
    callId: string;
    participants: Array<{ userId: string; username: string }>;
    spaceId: string;
    createdAt: Date;
    creatorId: string;
}

export const useWebRTC = (spaceId: string, userId: string) => {
    const [callParticipants, setCallParticipants] = useState<CallParticipant[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
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
            return socketRef.current;
        }

        socketRef.current = io(process.env.NEXT_PUBLIC_SIGNAL_SERVER_URL!);

        socketRef.current.on('connect', () => {
            setIsConnected(true);
            setError(null);
        });

        socketRef.current.on('disconnect', () => {
            setIsConnected(false);
            setError('Connection lost');
        });

        // Proximity call events
        socketRef.current.on(
            'proximity-call-created',
            (payload: { callId: string; participants: Array<{ userId: string; username: string }> }) => {
                setCurrentCallId(payload.callId);
                // Include local user in participants list
                const allParticipants = [...payload.participants];
                const localUserExists = allParticipants.some((p) => p.userId === userId);
                if (!localUserExists) {
                    allParticipants.push({ userId, username: 'You' }); // We'll get the actual username from the server
                }
                const newParticipants = allParticipants.map((participant) => ({
                    id: participant.userId,
                    username: participant.username,
                    stream: participant.userId === userId ? localStreamRef.current : null,
                    status: 'busy' as const,
                    isAudioEnabled: participant.userId === userId ? audioEnabled : true,
                    isVideoEnabled: participant.userId === userId ? videoEnabled : true,
                }));
                setCallParticipants(newParticipants);
                // Automatically join the proximity call
                joinProximityCall(payload.callId, userId, payload.participants);
            },
        );

        socketRef.current.on(
            'proximity-call-updated',
            (payload: { callId: string; participants: Array<{ userId: string; username: string }> }) => {
                setCurrentCallId(payload.callId);
                // Include local user in participants list
                const allParticipants = [...payload.participants];
                const localUserExists = allParticipants.some((p) => p.userId === userId);
                if (!localUserExists) {
                    allParticipants.push({ userId, username: 'You' }); // We'll get the actual username from the server
                }
                const newParticipants = allParticipants.map((participant) => ({
                    id: participant.userId,
                    username: participant.username,
                    stream: participant.userId === userId ? localStreamRef.current : null,
                    status: 'busy' as const,
                    isAudioEnabled: participant.userId === userId ? audioEnabled : true,
                    isVideoEnabled: participant.userId === userId ? videoEnabled : true,
                }));
                setCallParticipants(newParticipants);

                // Create peer connections for new remote users
                allParticipants.forEach((participant) => {
                    if (participant.userId !== userId && !peerConnectionsRef.current.has(participant.userId)) {
                        const pc = createPeerConnection(participant.userId);
                        peerConnectionsRef.current.set(participant.userId, pc);

                        // Create and send offer to remote user
                        pc.createOffer()
                            .then((offer) => {
                                pc.setLocalDescription(offer);
                                socketRef.current?.emit(
                                    'offer',
                                    spaceId,
                                    payload.callId,
                                    userId,
                                    participant.userId,
                                    offer,
                                );
                            })
                            .catch((error) => {
                                console.error(
                                    '[WebRTC] Failed to create offer for new user',
                                    participant.userId,
                                    error,
                                );
                            });
                    }
                });
            },
        );

        socketRef.current.on(
            'proximity-calls-merged',
            (payload: { callId: string; participants: Array<{ userId: string; username: string }> }) => {
                setCurrentCallId(payload.callId);
                // Include local user in participants list
                const allParticipants = [...payload.participants];
                const localUserExists = allParticipants.some((p) => p.userId === userId);
                if (!localUserExists) {
                    allParticipants.push({ userId, username: 'You' }); // We'll get the actual username from the server
                }
                const newParticipants = allParticipants.map((participant) => ({
                    id: participant.userId,
                    username: participant.username,
                    stream: participant.userId === userId ? localStreamRef.current : null,
                    status: 'busy' as const,
                    isAudioEnabled: participant.userId === userId ? audioEnabled : true,
                    isVideoEnabled: participant.userId === userId ? videoEnabled : true,
                }));
                setCallParticipants(newParticipants);
            },
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socketRef.current.on('user-left-proximity-call', (payload: any) => {
            // Defensive: If payload is not an object or doesn't have remainingParticipants as array, treat as empty
            let remainingParticipants: Array<{ userId: string; username: string }> = [];
            if (payload && typeof payload === 'object' && Array.isArray(payload.remainingParticipants)) {
                remainingParticipants = payload.remainingParticipants;
            }

            // Include local user in participants list if still in call
            const allParticipants = [...remainingParticipants];
            const localUserExists = allParticipants.some((p) => p.userId === userId);
            if (!localUserExists) {
                allParticipants.push({ userId, username: 'You' }); // We'll get the actual username from the server
            }
            setCallParticipants(
                allParticipants.map((participant) => ({
                    id: participant.userId,
                    username: participant.username,
                    stream: participant.userId === userId ? localStreamRef.current : null,
                    status: 'busy' as const,
                    isAudioEnabled: participant.userId === userId ? audioEnabled : true,
                    isVideoEnabled: participant.userId === userId ? videoEnabled : true,
                })),
            );

            // If current user left, clear call state
            if (payload && payload.leftUserId === userId) {
                setCurrentCallId('');
                currentCallIdRef.current = '';
                setCurrentCallInfo(null);
            }
        });

        // Legacy call events (for backward compatibility)
        socketRef.current.on('call-joined', (callId: string, participants: Set<string>) => {
            setCallParticipants(
                Array.from(participants).map((userId) => ({
                    id: userId,
                    username: 'Unknown',
                    status: 'busy' as const,
                    isAudioEnabled: true,
                    isVideoEnabled: true,
                })),
            );
        });

        socketRef.current.on('call-left', () => {
            setCurrentCallId('');
            setCallParticipants([]);
            setCurrentCallInfo(null);
        });

        socketRef.current.on('user-joined', (joinedUserId: string) => {
            //this is the userId of the new user who joined
            setCallParticipants((prev) => [
                ...prev,
                {
                    id: joinedUserId,
                    username: 'Unknown',
                    status: 'busy' as const,
                    isAudioEnabled: true,
                    isVideoEnabled: true,
                },
            ]);
        });

        socketRef.current.on('user-left', (leftUserId: string) => {
            // this is the userId of the user who left
            setCallParticipants((prev) => prev.filter((p) => p.id !== leftUserId));
        });

        // Call info events
        socketRef.current.on('call-info', (callInfo: CallInfo | null) => {
            setCurrentCallInfo(callInfo);
            if (callInfo) {
                setCurrentCallId(callInfo.callId);
                // Include local user in participants list
                const allParticipants = [...callInfo.participants];
                const localUserExists = allParticipants.some((p) => p.userId === userId);
                if (!localUserExists) {
                    allParticipants.push({ userId, username: 'You' });
                }
                setCallParticipants(
                    allParticipants.map((participant) => ({
                        id: participant.userId,
                        username: participant.username,
                        stream: participant.userId === userId ? localStreamRef.current : null,
                        status: 'busy' as const,
                        isAudioEnabled: participant.userId === userId ? audioEnabled : true,
                        isVideoEnabled: participant.userId === userId ? videoEnabled : true,
                    })),
                );
            }
        });

        // WebRTC signaling events
        socketRef.current.on(
            'offer',
            async (callId: string, fromUserId: string, toUserId: string, offer: RTCSessionDescriptionInit) => {
                if (toUserId !== userIdRef.current) {
                    return;
                }
                try {
                    const pc = createPeerConnection(fromUserId);
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    peerConnectionsRef.current.set(fromUserId, pc);

                    const answer = await pc.createAnswer();
                    pc.setLocalDescription(answer);

                    if (currentCallIdRef.current) {
                        socketRef.current?.emit(
                            'answer',
                            spaceId,
                            currentCallIdRef.current,
                            userIdRef.current,
                            fromUserId,
                            answer,
                        );
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
                if (toUserId !== userIdRef.current) {
                    return;
                }
                try {
                    const pc = peerConnectionsRef.current.get(fromUserId); // use existing connection
                    if (!pc) {
                        console.warn(`[WebRTC] No peer connection found for user ${fromUserId} to handle answer`);
                        return;
                    }

                    pc.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (error) {
                    console.error(`[WebRTC] Failed to set remote description from ${fromUserId}:`, error);
                    setError('Failed to set remote description from peer');
                }
            },
        );

        socketRef.current.on(
            'ice-candidate',
            (_callId: string, fromUserId: string, toUserId: string, candidate: RTCIceCandidateInit) => {
                if (toUserId !== userIdRef.current) {
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

        // Remote user audio/video toggle events
        socketRef.current.on('remote-audio-toggled', (remoteUserId: string, isEnabled: boolean) => {
            setCallParticipants((prev) =>
                prev.map((participant) =>
                    participant.id === remoteUserId ? { ...participant, isAudioEnabled: isEnabled } : participant,
                ),
            );
        });

        socketRef.current.on('remote-video-toggled', (remoteUserId: string, isEnabled: boolean) => {
            setCallParticipants((prev) =>
                prev.map((participant) =>
                    participant.id === remoteUserId ? { ...participant, isVideoEnabled: isEnabled } : participant,
                ),
            );
        });

        return socketRef.current;
    };

    const createPeerConnection = (remoteUserId: string) => {
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
            // Only add tracks that are currently enabled
            localStreamRef.current.getTracks().forEach((track) => {
                if ((track.kind === 'audio' && audioEnabled) || (track.kind === 'video' && videoEnabled)) {
                    pc.addTrack(track, localStreamRef.current!);
                }
            });
        }

        //when the remote user sends a stream, we add it to the callParticipants list
        pc.ontrack = (event: RTCTrackEvent) => {
            console.log('[WebRTC] Received track from', remoteUserId, 'kind:', event.track.kind, 'streams:', event.streams.length);
            
            setCallParticipants((prev) => {
                const existingParticipant = prev.find((p) => p.id === remoteUserId);
                
                if (!existingParticipant) {
                    // Create new participant
                    const username = 'Unknown'; // We'll get this from the signaling server
                    const newParticipants = [
                        ...prev,
                        {
                            id: remoteUserId,
                            username,
                            stream: event.streams[0],
                            status: 'busy' as const,
                            isAudioEnabled: true,
                            isVideoEnabled: true,
                        },
                    ];
                    console.log('[WebRTC] Added new participant:', remoteUserId);
                    return newParticipants;
                } else {
                    // Update existing participant's stream
                    const updatedParticipants = prev.map((p) => {
                        if (p.id === remoteUserId) {
                            console.log('[WebRTC] Updated existing participant stream:', remoteUserId);
                            
                            // If we have an existing stream, merge the new tracks
                            if (p.stream && event.streams && event.streams.length > 0) {
                                const newStream = new MediaStream();
                                
                                // Add all existing tracks
                                p.stream.getTracks().forEach(track => {
                                    newStream.addTrack(track);
                                });
                                
                                // Add new tracks from the event
                                event.streams[0].getTracks().forEach(track => {
                                    // Only add if not already present
                                    if (!newStream.getTracks().some(existingTrack => existingTrack.id === track.id)) {
                                        newStream.addTrack(track);
                                    }
                                });
                                
                                return { ...p, stream: newStream };
                            } else {
                                // Use the new stream directly
                                return { ...p, stream: event.streams[0] };
                            }
                        }
                        return p;
                    });
                    return updatedParticipants;
                }
            });
        };

        //when the remote user sends an ice candidate, we send it to the server
        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate && currentCallIdRef.current) {
                socketRef.current?.emit(
                    'ice-candidate',
                    spaceId,
                    currentCallIdRef.current,
                    userId,
                    remoteUserId,
                    event.candidate,
                );
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                pc.close();
                setCallParticipants((prev) => prev.filter((p) => p.id !== remoteUserId));
                peerConnectionsRef.current.delete(remoteUserId);
            }
        };


        return pc;
    };

    const getUserMedia = async () => {
        try {
            // Only request media that is currently enabled
            const constraints = {
                video: videoEnabled ? {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                } : false,
                audio: audioEnabled ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                } : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            localStreamRef.current = stream;
            setLocalStream(stream);
            setError(null);
            
            // Ensure local participant has stream
            setCallParticipants((prev) => {
                const exists = prev.some((p) => p.id === userId);
                if (!exists) {
                    return [
                        ...prev,
                        {
                            id: userId,
                            username: 'You',
                            stream,
                            status: 'busy' as const,
                            isAudioEnabled: audioEnabled,
                            isVideoEnabled: videoEnabled,
                        },
                    ];
                } else {
                    return prev.map((p) => (p.id === userId ? { ...p, stream } : p));
                }
            });
        } catch (error) {
            console.error('error getting user media', error);
            setError('Failed to access camera and microphone');
        }
    };

    const toggleAudio = async () => {
        const newAudioEnabled = !audioEnabled;
        setAudioEnabled(newAudioEnabled);

        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            
            if (newAudioEnabled) {
                // If we have audio tracks, just enable them
                if (audioTracks.length > 0) {
                    audioTracks.forEach(track => {
                        track.enabled = true;
                    });
                } else {
                    // If no audio tracks exist, create new ones
                    try {
                        const audioStream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true,
                            },
                            video: false,
                        });

                        const audioTrack = audioStream.getAudioTracks()[0];
                        if (audioTrack) {
                            localStreamRef.current!.addTrack(audioTrack);

                            // Update all peer connections with the new audio track
                            peerConnectionsRef.current.forEach((pc) => {
                                const senders = pc.getSenders();
                                const audioSender = senders.find(sender => sender.track?.kind === 'audio');
                                if (audioSender) {
                                    audioSender.replaceTrack(audioTrack);
                                } else {
                                    pc.addTrack(audioTrack, localStreamRef.current!);
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Failed to re-enable audio:', error);
                        setError('Failed to re-enable audio');
                        return;
                    }
                }
            } else {
                // Disable audio tracks without stopping them
                audioTracks.forEach(track => {
                    track.enabled = false;
                });
            }
        }

        // Update local participant's audio state in callParticipants
        setCallParticipants((prev) =>
            prev.map((participant) =>
                participant.id === userId ? { ...participant, isAudioEnabled: newAudioEnabled } : participant,
            ),
        );

        // Emit audio toggle event to signal server
        if (socketRef.current?.connected && currentCallIdRef.current) {
            socketRef.current.emit('audio-toggled', spaceId, currentCallIdRef.current, userId, newAudioEnabled);
        }
    };

    const toggleVideo = async () => {
        const newVideoEnabled = !videoEnabled;
        setVideoEnabled(newVideoEnabled);

        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            
            if (newVideoEnabled) {
                // If we have video tracks, just enable them
                if (videoTracks.length > 0) {
                    videoTracks.forEach(track => {
                        track.enabled = true;
                    });
                } else {
                    // If no video tracks exist, create new ones
                    try {
                        const videoStream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                facingMode: 'user',
                                width: { ideal: 1280 },
                                height: { ideal: 720 },
                            },
                            audio: false,
                        });

                        const videoTrack = videoStream.getVideoTracks()[0];
                        if (videoTrack) {
                            localStreamRef.current!.addTrack(videoTrack);

                            // Update all peer connections with the new video track
                            peerConnectionsRef.current.forEach((pc) => {
                                const senders = pc.getSenders();
                                const videoSender = senders.find(sender => sender.track?.kind === 'video');
                                if (videoSender) {
                                    videoSender.replaceTrack(videoTrack);
                                } else {
                                    pc.addTrack(videoTrack, localStreamRef.current!);
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Failed to re-enable video:', error);
                        setError('Failed to re-enable video');
                        return;
                    }
                }
            } else {
                // Disable video tracks without stopping them
                videoTracks.forEach(track => {
                    track.enabled = false;
                });
            }
        }

        // Update local participant's video state in callParticipants
        setCallParticipants((prev) =>
            prev.map((participant) =>
                participant.id === userId ? { ...participant, isVideoEnabled: newVideoEnabled } : participant,
            ),
        );

        // Emit video toggle event to signal server
        if (socketRef.current?.connected && currentCallIdRef.current) {
            socketRef.current.emit('video-toggled', spaceId, currentCallIdRef.current, userId, newVideoEnabled);
        }
    };

    /**
     * Update a specific participant's audio state
     */
    const updateParticipantAudio = useCallback((participantId: string, isEnabled: boolean) => {
        setCallParticipants((prev) =>
            prev.map((participant) =>
                participant.id === participantId ? { ...participant, isAudioEnabled: isEnabled } : participant,
            ),
        );
    }, []);

    /**
     * Update a specific participant's video state
     */
    const updateParticipantVideo = useCallback((participantId: string, isEnabled: boolean) => {
        setCallParticipants((prev) =>
            prev.map((participant) =>
                participant.id === participantId ? { ...participant, isVideoEnabled: isEnabled } : participant,
            ),
        );
    }, []);



    // Proximity-based call management functions

    /**
     * Handle proximity updates from the WebSocket server
     */
    const handleProximityUpdate = useCallback((proximityUsers: ProximityUser[]) => {
        setProximityUsers(proximityUsers);

        // Ensure socket is initialized
        if (!socketRef.current?.connected) {
            initializeSocket();
        }

        // The WebSocket server will handle the proximity call logic automatically
        // We just need to ensure we have media access when calls are created
        if (proximityUsers.length > 0 && !localStreamRef.current && (audioEnabled || videoEnabled)) {
            getUserMedia();
        }
    }, []);

    const joinProximityCall = useCallback(
        async (callId: string, participantId: string, participants?: Array<{ userId: string; username: string }>) => {
            try {
                if (!socketRef.current?.connected) {
                    const socket = initializeSocket();
                    socketRef.current = socket!;
                }

                // Ensure we have media access (only if audio or video is enabled)
                if (!localStreamRef.current && (audioEnabled || videoEnabled)) {
                    await getUserMedia();
                }

                if (!socketRef.current?.connected) {
                    setCallError('Not connected to server');
                    return;
                }

                socketRef.current?.emit('join-proximity-call', spaceId, callId, participantId);

                // Set the call ID immediately in both state and ref
                setCurrentCallId(callId);
                currentCallIdRef.current = callId;

                // Set participants from server if provided, otherwise ensure local user is in list
                if (participants && participants.length > 0) {
                    const allParticipants = [...participants];
                    const localUserExists = allParticipants.some((p) => p.userId === userId);
                    if (!localUserExists) {
                        allParticipants.push({ userId, username: 'You' });
                    }
                    setCallParticipants(
                        allParticipants.map((participant) => ({
                            id: participant.userId,
                            username: participant.username,
                            stream: participant.userId === userId ? localStreamRef.current : null,
                            status: 'busy' as const,
                            isAudioEnabled: participant.userId === userId ? audioEnabled : true,
                            isVideoEnabled: participant.userId === userId ? videoEnabled : true,
                        })),
                    );

                    // Create peer connections for remote users
                    allParticipants.forEach((participant) => {
                        if (participant.userId !== userId && !peerConnectionsRef.current.has(participant.userId)) {
                            const pc = createPeerConnection(participant.userId);
                            peerConnectionsRef.current.set(participant.userId, pc);

                            // Create and send offer to remote user
                            pc.createOffer()
                                .then((offer) => {
                                    pc.setLocalDescription(offer)
                                        .then(() => {
                                            socketRef.current?.emit(
                                                'offer',
                                                spaceId,
                                                callId,
                                                userId,
                                                participant.userId,
                                                offer,
                                            );
                                        })
                                        .catch((error) => {
                                            console.error(
                                                '[WebRTC] Failed to set local description for',
                                                participant.userId,
                                                error,
                                            );
                                        });
                                })
                                .catch((error) => {
                                    console.error('[WebRTC] Failed to create offer for', participant.userId, error);
                                });
                        }
                    });
                } else {
                    // Fallback: ensure local user is in participants list
                    setCallParticipants((prev) => {
                        const hasLocalUser = prev.some((p) => p.id === userId);
                        if (!hasLocalUser) {
                            return [
                                ...prev,
                                {
                                    id: userId,
                                    username: 'You',
                                    stream: localStreamRef.current,
                                    status: 'busy' as const,
                                    isAudioEnabled: audioEnabled,
                                    isVideoEnabled: videoEnabled,
                                },
                            ];
                        }
                        return prev;
                    });
                }

                setCallError(null);
            } catch (error) {
                console.error('[WebRTC] Error joining proximity call:', error);
                setError('Failed to join proximity call');
            }
        },
        [spaceId, userId],
    );

    const leaveProximityCall = useCallback(() => {
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

    // Ensure local user is always included in participants when in a call
    useEffect(() => {
        if (currentCallId && callParticipants.length > 0) {
            const hasLocalUser = callParticipants.some((p) => p.id === userId);
            if (!hasLocalUser) {
                setCallParticipants((prev) => [
                    ...prev,
                    {
                        id: userId,
                        username: 'You',
                        stream: localStreamRef.current,
                        status: 'busy' as const,
                        isAudioEnabled: audioEnabled,
                        isVideoEnabled: videoEnabled,
                    },
                ]);
            }
        }
    }, [currentCallId, callParticipants.length, userId, audioEnabled, videoEnabled]);

    // Handle audio/video state changes and update stream accordingly
    useEffect(() => {
        if (localStreamRef.current) {
            // Update audio tracks
            const audioTracks = localStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                if (track.enabled !== audioEnabled) {
                    track.enabled = audioEnabled;
                }
            });

            // Update video tracks
            const videoTracks = localStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                if (track.enabled !== videoEnabled) {
                    track.enabled = videoEnabled;
                }
            });
        }
    }, [audioEnabled, videoEnabled]);

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
        // Proximity-based call management
        proximityUsers,
        currentCallInfo,
        handleProximityUpdate,
        joinProximityCall,
        leaveProximityCall,
        updateParticipantAudio,
        updateParticipantVideo,
    };
};
