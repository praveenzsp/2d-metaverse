'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ArenaBottombar from '@/components/ArenaBottombar';
import ArenaTopBar from '@/components/ArenaTopBar';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import axios from '@/lib/axios';
// import VideoBox from '@/components/VideoBox';

const UserSpaceArena = dynamic(() => import('@/components/UserSpaceArena'), { ssr: false });

export default function SpacePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const spaceId = searchParams.get('spaceId');

    const [userId, setUserId] = useState('');
    const [username, setUsername] = useState('User');
    const [spaceName, setSpaceName] = useState('Space');

    const arenaRef = useRef<{ handleDeleteSelected?: () => void; cleanup?: () => Promise<void> }>(null);

    // const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const fetchUsername = async () => {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me`);
            const username = response.data.username;
            setUsername(username);
            setUserId(response.data.userId);
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

    return (
        <div
            className="h-screen w-screen relative flex flex-col gap-1
        "
        >
            <ArenaTopBar spaceName={spaceName} />

            <div className="w-full h-full overflow-hidden">
                <div className="absolute flex flex-row items-center justify-center  gap-2 left-1/2 transform -translate-x-1/2 p-2">
                    {/* <VideoBox
                        videoRef={videoRef}
                        variant="medium"
                        avatarUrl={username}
                        videoEnabled={true}
                        audioEnabled={true}
                        showExpandButton={true}
                    />
                    <VideoBox
                        videoRef={videoRef}
                        variant="medium"
                        avatarUrl={username}
                        videoEnabled={true}
                        audioEnabled={true}
                        showExpandButton={true}
                    /> */}
                </div>
                <UserSpaceArena ref={arenaRef} spaceId={spaceId} userId={userId} />
            </div>

            <ArenaBottombar
                userName={username}
                onChat={() => {}}
                onLeave={handleLeave}
                onParticipants={() => {}}
                onShareScreen={() => {}}
                onEditMap={() => {}}
                isAdmin={false}
            />
        </div>
    );
}
