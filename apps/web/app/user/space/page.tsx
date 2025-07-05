'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ArenaBottombar from '@/components/ArenaBottombar';
import ArenaTopBar from '@/components/ArenaTopBar';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import axios from '@/lib/axios';

const UserSpaceArena = dynamic(() => import('@/components/UserSpaceArena'), { ssr: false });

export default function SpacePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const spaceId = searchParams.get('spaceId');
    // const [isChatOpen, setIsChatOpen] = useState(false);
    const [username, setUsername] = useState('User');
    const [spaceName, setSpaceName] = useState('Space');
    // const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
    const arenaRef = useRef<{ handleDeleteSelected?: () => void; cleanup?: () => Promise<void> }>(null);

    useEffect(() => {
        const fetchUsername = async () => {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me`);
            const username = response.data.username;
            setUsername(username);
        };
        const fetchSpaceName = async () => {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/${spaceId}`);
            setSpaceName(response.data.name);
        };
        fetchUsername();
        fetchSpaceName();
    }, [spaceId]);
    if (!spaceId) return null;

    const handleLeave = async () => {
        // Clean up the scene before navigating away
        if (arenaRef.current?.cleanup) {
            await arenaRef.current.cleanup();
        }

        // Add a small delay to ensure all cleanup is complete
        await new Promise((resolve) => setTimeout(resolve, 200));

        router.push('/user/dashboard');
    };

    // Ensure only one sidebar is open at a time
    // const handleChat = () => {
    //     setIsChatOpen((prev) => !prev);
    //     setIsParticipantsOpen(false);
    // };

    // const handleParticipants = () => {
    //     setIsParticipantsOpen((prev) => !prev);
    //     setIsChatOpen(false);
    // };

    return (
        <div className="h-screen w-screen relative flex flex-col gap-1
        ">
            <ArenaTopBar spaceName={spaceName} />
            <UserSpaceArena ref={arenaRef} spaceId={spaceId} />
            <ArenaBottombar
                userName={username}
                onChat={() => {}}
                onLeave={handleLeave}
                onParticipants={() => {}}
                onShareScreen={() => {}}
                onEditMap={() => {}}
                isAdmin={false}
            />

            {/* Chat Sidebar */}
            {/* <div
                className={`fixed top-0 right-0 h-full w-90 bg-gray-900 text-white shadow-lg flex flex-col z-30 transition-transform duration-1000 transform ${isChatOpen ? 'translate-x-0' : 'translate-x-full'} pointer-events-auto`}
                style={{ display: isChatOpen ? 'flex' : 'none' }}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <span className="font-bold">Chat</span>
                    <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">
                        ✕
                    </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <p className="text-muted-foreground">Chat coming soon...</p>
                </div>
            </div> */}

            {/* Participants Sidebar */}
            {/* <div
                className={`fixed top-0 right-0 h-full w-90 bg-gray-900 text-white shadow-lg flex flex-col z-30 transition-transform duration-1000 transform ${isParticipantsOpen ? 'translate-x-0' : 'translate-x-full'} pointer-events-auto`}
                style={{ display: isParticipantsOpen ? 'flex' : 'none' }}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <span className="font-bold">Participants</span>
                    <button onClick={() => setIsParticipantsOpen(false)} className="text-gray-400 hover:text-white">
                        ✕
                    </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <p className="text-muted-foreground">Participants coming soon...</p>
                </div>
            </div> */}
        </div>
    );
}
