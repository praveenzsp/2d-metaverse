'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ArenaBottombar from '@/components/arena/ArenaBottombar';
import ArenaTopBar from '@/components/arena/ArenaTopBar';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, Suspense } from 'react';
import axios from '@/lib/axios';
import ParticipantsSideBar, { Participant } from '@/components/arena/ParticipantsSideBar';
import ChatSideBar, { ChatMessage } from '@/components/arena/ChatSideBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const UserSpaceArena = dynamic(() => import('@/components/arena/UserSpaceArena'), { ssr: false });

function SpacePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const spaceId = searchParams.get('spaceId');

    const [userId, setUserId] = useState('');
    const [username, setUsername] = useState('User');
    const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>(undefined);
    const [spaceName, setSpaceName] = useState('Space');
    const [callStatus, setCallStatus] = useState({
        isInCall: false,
        callParticipantsCount: 0,
        proximityUsersCount: 0,
    });

    const [participantsSideBarOpen, setParticipantsSideBarOpen] = useState(false);
    const [chatSideBarOpen, setChatSideBarOpen] = useState(false);

    const [spaceParticipants, setSpaceParticipants] = useState<Participant[]>([]);
    const [spaceMessages, setSpaceMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMeetingViewEnabled, setIsMeetingViewEnabled] = useState(false);

    const arenaRef = useRef<{
        handleDeleteSelected?: () => void;
        cleanup?: () => Promise<void>;
        sendChatMessage?: (message: string) => void;
        requestChatMessages?: () => void;
        disableKeyboardInput?: () => void;
        enableKeyboardInput?: () => void;
    }>(null);

    // Disable browser back navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            return 'Are you sure you want to leave? You will be disconnected from the space.';
        };

        const handlePopState = (e: PopStateEvent) => {
            e.preventDefault();
            // Push the current state back to prevent navigation
            window.history.pushState(null, '', window.location.href);
        };

        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);
        
        // Push current state to history
        window.history.pushState(null, '', window.location.href);

        // Cleanup function
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!spaceId) return;

            try {
                setIsLoading(true);
                setError(null);

                // Fetch all data in parallel for better performance
                const [userResponse, spaceResponse, participantsResponse, chatResponse] = await Promise.all([
                    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me`),
                    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/${spaceId}`),
                    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/users/${spaceId}`),
                    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/chat/${spaceId}`),
                ]);

                setUsername(userResponse.data.username);
                setUserId(userResponse.data.userId);
                setUserAvatarUrl(userResponse.data.avatarUrl);
                setSpaceName(spaceResponse.data.name);
                setSpaceParticipants(participantsResponse.data.users);

                // Convert chat messages to the expected format
                const chatMessages: ChatMessage[] = chatResponse.data.messages.map(
                    (message: {
                        id: string;
                        userId: string;
                        username: string;
                        avatarUrl?: string;
                        message: string;
                        timestamp: string;
                        spaceId: string;
                    }) => ({
                        id: message.id,
                        userId: message.userId,
                        userName: message.username,
                        userAvatar: message.avatarUrl,
                        message: message.message,
                        timestamp: new Date(message.timestamp),
                        isCurrentUser: message.userId === userResponse.data.userId,
                    }),
                );
                setSpaceMessages(chatMessages);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load space data');
                setSpaceParticipants([]); // Fallback to empty array
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [spaceId]);

    // Set up a polling mechanism to refresh participants list
    useEffect(() => {
        if (!spaceId) return;

        const interval = setInterval(async () => {
            try {
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/users/${spaceId}`,
                );
                setSpaceParticipants(response.data.users);
            } catch (error) {
                console.error('Failed to refresh participants:', error);
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [spaceId]);

    if (!spaceId) return null;

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading space...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const handleLeave = async () => {
        // Clean up the scene before navigating away
        if (arenaRef.current?.cleanup) {
            await arenaRef.current.cleanup();
        }
        // Add a small delay to ensure all cleanup is complete
        await new Promise((resolve) => setTimeout(resolve, 200));
        router.push('/user/dashboard');
    };

    const handleParticipantsSidebar = () => {
        if (chatSideBarOpen) {
            setChatSideBarOpen(false);
        }
        setParticipantsSideBarOpen(!participantsSideBarOpen);
    };

    const handleChatSidebar = () => {
        if (participantsSideBarOpen) {
            setParticipantsSideBarOpen(false);
        }

        const newChatSideBarOpen = !chatSideBarOpen;
        setChatSideBarOpen(newChatSideBarOpen);

        // Disable/enable keyboard input based on chat sidebar state
        if (newChatSideBarOpen) {
            arenaRef.current?.disableKeyboardInput?.();
        } else {
            arenaRef.current?.enableKeyboardInput?.();
        }
    };

    const handleSendMessage = (message: string) => {
        if (arenaRef.current?.sendChatMessage) {
            arenaRef.current.sendChatMessage(message);

            // Add the message to local state immediately for the current user
            const newMessage: ChatMessage = {
                id: `temp-${Date.now()}`, // Temporary ID until server responds
                userId: userId,
                userName: username,
                userAvatar: userAvatarUrl,
                message: message,
                timestamp: new Date(),
                isCurrentUser: true,
            };
            setSpaceMessages((prev) => [...prev, newMessage]);
        }
    };

    const handleChatMessage = (message: {
        id: string;
        userId: string;
        username: string;
        avatarUrl?: string;
        message: string;
        timestamp: string | Date;
        spaceId: string;
    }) => {
        const chatMessage: ChatMessage = {
            id: message.id,
            userId: message.userId,
            userName: message.username,
            userAvatar: message.avatarUrl,
            message: message.message,
            timestamp: new Date(message.timestamp),
            isCurrentUser: message.userId === userId,
        };

        setSpaceMessages((prev) => {
            // If this is a message from the current user, replace the temporary message
            if (message.userId === userId) {
                // Remove any temporary messages with the same content and add the real one
                const filteredMessages = prev.filter(
                    (msg) => !(msg.id.startsWith('temp-') && msg.message === message.message),
                );
                return [...filteredMessages, chatMessage];
            } else {
                // For other users' messages, just add them
                return [...prev, chatMessage];
            }
        });
    };

    const handleChatMessages = (
        messages: {
            id: string;
            userId: string;
            username: string;
            avatarUrl?: string;
            message: string;
            timestamp: string | Date;
            spaceId: string;
        }[],
    ) => {
        const chatMessages: ChatMessage[] = messages.map((message) => ({
            id: message.id,
            userId: message.userId,
            userName: message.username,
            userAvatar: message.avatarUrl,
            message: message.message,
            timestamp: new Date(message.timestamp),
            isCurrentUser: message.userId === userId,
        }));
        setSpaceMessages(chatMessages);
    };

    return (
        <ProtectedRoute requiredRole="User">
        <div
            className="h-screen w-screen relative flex flex-col gap-1
        "
        >
            <ArenaTopBar
                spaceName={spaceName}
                isMeetingViewEnabled={isMeetingViewEnabled}
                setIsMeetingViewEnabled={setIsMeetingViewEnabled}
            />

            <div className="w-full h-full overflow-hidden">
                <div className="absolute flex flex-row items-center justify-center  gap-2 left-1/2 transform -translate-x-1/2 p-2"></div>
                <UserSpaceArena
                    ref={arenaRef}
                    spaceId={spaceId}
                    userId={userId}
                    onCallStatusChange={setCallStatus}
                    onChatMessage={handleChatMessage}
                    onChatMessages={handleChatMessages}
                    isMeetingViewEnabled={isMeetingViewEnabled}
                    setIsMeetingViewEnabled={setIsMeetingViewEnabled}
                />
                {/* Participants Sidebar */}
                <ParticipantsSideBar
                    isOpen={participantsSideBarOpen}
                    onClose={() => setParticipantsSideBarOpen(false)}
                    participants={spaceParticipants}
                    currentUserId={userId}
                />
                {/* Chat Sidebar */}
                <ChatSideBar
                    isOpen={chatSideBarOpen}
                    onClose={() => setChatSideBarOpen(false)}
                    messages={spaceMessages}
                    currentUserId={userId}
                    currentUserName={username}
                    onSendMessage={handleSendMessage}
                />
            </div>

            <ArenaBottombar
                spaceId={spaceId}
                userId={userId}
                userName={username}
                onChat={handleChatSidebar}
                onLeave={handleLeave}
                onParticipants={handleParticipantsSidebar}
                onShareScreen={() => {}}
                onEditMap={() => {}}
                isAdmin={false}
                isInCall={callStatus.isInCall}
                callParticipantsCount={callStatus.callParticipantsCount}
                proximityUsersCount={callStatus.proximityUsersCount}
            />
        </div>
        </ProtectedRoute>
    );
}

export default function SpacePage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <SpacePageContent />
        </Suspense>
    );
}
