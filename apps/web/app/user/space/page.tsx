'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ArenaBottombar from '@/components/ArenaBottombar';
import ArenaTopBar from '@/components/ArenaTopBar';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import axios from '@/lib/axios';
import ParticipantsSideBar, { Participant } from '@/components/ParticipantsSideBar';
import ChatSideBar from '@/components/ChatSideBar';


const UserSpaceArena = dynamic(() => import('@/components/UserSpaceArena'), { ssr: false });

export default function SpacePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const spaceId = searchParams.get('spaceId');

    const [userId, setUserId] = useState('');
    const [username, setUsername] = useState('User');
    const [spaceName, setSpaceName] = useState('Space');
    const [callStatus, setCallStatus] = useState({
        isInCall: false,
        callParticipantsCount: 0,
        proximityUsersCount: 0,
    });

    const [participantsSideBarOpen, setParticipantsSideBarOpen] = useState(false);
    const [chatSideBarOpen, setChatSideBarOpen] = useState(false);

    const [spaceParticipants, setSpaceParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const arenaRef = useRef<{ handleDeleteSelected?: () => void; cleanup?: () => Promise<void> }>(null);



    useEffect(() => {
        const fetchData = async () => {
            if (!spaceId) return;
            
            try {
                setIsLoading(true);
                setError(null);
                
                // Fetch all data in parallel for better performance
                const [userResponse, spaceResponse, participantsResponse] = await Promise.all([
                    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me`),
                    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/${spaceId}`),
                    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/users/${spaceId}`)
                ]);
                
                setUsername(userResponse.data.username);
                setUserId(userResponse.data.userId);
                setSpaceName(spaceResponse.data.name);
                setSpaceParticipants(participantsResponse.data.users);
                
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
                const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/users/${spaceId}`);
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
        if(chatSideBarOpen){
            setChatSideBarOpen(false);
        }
        setParticipantsSideBarOpen(!participantsSideBarOpen);
    };

    const handleChatSidebar = () => {
        if(participantsSideBarOpen){
            setParticipantsSideBarOpen(false);
        }
        setChatSideBarOpen(!chatSideBarOpen);
    };

    return (
        <div
            className="h-screen w-screen relative flex flex-col gap-1
        "
        >
            <ArenaTopBar spaceName={spaceName} />

            <div className="w-full h-full overflow-hidden">
                <div className="absolute flex flex-row items-center justify-center  gap-2 left-1/2 transform -translate-x-1/2 p-2">
                </div>
                <UserSpaceArena 
                    ref={arenaRef} 
                    spaceId={spaceId} 
                    userId={userId}
                    onCallStatusChange={setCallStatus}
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
                    messages={[]}
                    currentUserId={userId}
                    currentUserName={username}
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
    );
}
