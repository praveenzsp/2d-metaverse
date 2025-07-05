import { useCallback, useRef, useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';

interface Participant {
    id: string;
    stream?: MediaStream | null;
    username: string;
    avatarUrl: string;
    status?: 'ready' | 'busy' | 'connected' | 'rejected' | 'disconnected';
}

export const useWebrtc = (roomId: string, userId: string) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);

    const initializeSocket = () => {
        if (socketRef.current?.connected) return;

        socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL!);

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

        socketRef.current.on('room-members', (members: Participant[]) => {
            console.log('room members', members);
            setParticipants(members);
        });

        socketRef.current.on('user-joined', (newUser: Participant) => {
            console.log(`${newUser.id} joined the room ${roomId}`);
            if (newUser.id !== userId) {
                setParticipants((prev) => [...prev, newUser]);
            }
        });

        socketRef.current.on('user-left', (leftUser: Participant) => {
            console.log(`${leftUser.id} left the room ${roomId}`);
            setParticipants((prev) => prev.filter((user) => user.id !== leftUser.id));
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
                receivedOffer,
            }: {
                from: string;
                to: string;
                receivedOffer: RTCSessionDescriptionInit;
            }) => {
                if (to !== userId) return;

                console.log(`${from} offered to ${to}`);
                try {
                    const pc = createPeerConnection(from);
                    await pc.setRemoteDescription(new RTCSessionDescription(receivedOffer!));

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    socketRef.current?.emit('answer', roomId, userId, from, answer);
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
                receivedAnswer,
            }: {
                from: string;
                to: string;
                receivedAnswer: RTCSessionDescriptionInit;
            }) => {
                if (to !== userId) return;

                console.log(`${from} answered to ${to}`);
                try {
                    const pc = createPeerConnection(from);
                    await pc.setRemoteDescription(new RTCSessionDescription(receivedAnswer!));
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
                receivedCandidate,
            }: {
                from: string;
                to: string;
                receivedCandidate: RTCIceCandidateInit;
            }) => {
                if (to !== userId) return;

                console.log(`${from} sent an ice candidate to ${to}`);
                try {
                    const pc = createPeerConnection(from);
                    if (pc && receivedCandidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(receivedCandidate!));
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
                socketRef.current?.emit('connection-accepted', roomId, userId, data.from);
            }
        });

        socketRef.current.on('connection-accepted', (data: { from: string; to: string }) => {
            console.log(`Connection accepted from ${data.from} to ${data.to}`);
            // Update participant status to connected
            setParticipants((prev) => 
                prev.map((p) => 
                    p.id === data.from ? { ...p, status: 'connected' } : p
                )
            );
        });

        socketRef.current.on('connection-rejected', (data: { from: string; to: string }) => {
            console.log(`Connection rejected from ${data.from} to ${data.to}`);
            // Update participant status to rejected
            setParticipants((prev) => 
                prev.map((p) => 
                    p.id === data.from ? { ...p, status: 'rejected' } : p
                )
            );
        });

        socketRef.current.on('connection-closed', (data: { from: string; to: string }) => {
            console.log(`Connection closed from ${data.from} to ${data.to}`);
            // Close peer connection and update status
            const pc = peerConnectionsRef.current.get(data.from);
            if (pc) {
                pc.close();
                peerConnectionsRef.current.delete(data.from);
            }
            setParticipants((prev) => 
                prev.map((p) => 
                    p.id === data.from ? { ...p, status: 'disconnected', stream: null } : p
                )
            );
        });

        socketRef.current.on('user-ready', (userId: string) => {
            console.log(`User ${userId} is ready`);
            // Update participant status to ready
            setParticipants((prev) => 
                prev.map((p) => 
                    p.id === userId ? { ...p, status: 'ready' } : p
                )
            );
        });

        socketRef.current.on('user-busy', (userId: string) => {
            console.log(`User ${userId} is busy`);
            // Update participant status to busy
            setParticipants((prev) => 
                prev.map((p) => 
                    p.id === userId ? { ...p, status: 'busy' } : p
                )
            );
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
            setParticipants((prev) => prev.filter((p) => p.id !== userId));
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

        //when the remote user sends a stream, we add it to the participants list
        pc.ontrack = (event: RTCTrackEvent) => {
            console.log('Received remote stream from', remoteUserId);
            setParticipants((prev) => {
                return prev.map((p) => {
                    return p.id === remoteUserId ? { ...p, stream: event.streams[0] } : p;
                });
            });
        };

        //when the remote user sends an ice candidate, we send it to the server
        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                socketRef.current?.emit('ice-candidate', roomId, userId, remoteUserId, event.candidate);
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state changed to', pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                console.log('Connection failed or disconnected, closing peer connection');
                pc.close();
                setParticipants((prev) => prev.filter((p) => p.id !== remoteUserId));
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

    const joinRoom = async () => {
        try {
            const socket = initializeSocket();

            await getUserMedia();

            socket?.emit('join-room', roomId, userId);

            setParticipants((prev) => {
                const newParticipants = [...prev];
                newParticipants.forEach(async (participant: Participant) => {
                    // this user is sending an offer to every other user in the room
                    if (participant.id != userId) {
                        const pc = createPeerConnection(participant.id);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socket?.emit('offer', roomId, userId, participant.id, offer);
                    }
                });
                return newParticipants;
            });
        } catch (error) {
            console.error('error joining room', error);
            setError('Failed to join room');
        }
    };

    const leaveRoom = useCallback(() => {
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    track.stop();
                });
                localStreamRef.current = null;
                setLocalStream(null);
            }

            peerConnectionsRef.current.forEach((pc) => pc.close());
            peerConnectionsRef.current.clear();

            socketRef.current?.emit('leave-room', roomId, userId);
            socketRef.current = null;
            setParticipants([]);
            setIsConnected(false);
            setError(null);
        } catch (error) {
            console.error('error leaving room', error);
            setError('Failed to leave room');
        }
    }, [roomId, userId]);

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

    useEffect(() => {
        return () => {
            leaveRoom();
        };
    }, [leaveRoom]);

    return {
        participants,
        localStream,
        isConnected,
        error,
        audioEnabled,
        videoEnabled,
        joinRoom,
        leaveRoom,
        toggleAudio,
        toggleVideo,
    };
};