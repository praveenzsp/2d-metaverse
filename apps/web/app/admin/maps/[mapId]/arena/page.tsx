'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ArenaBottombar from '@/components/ArenaBottombar';

interface Map {
    id: string;
    name: string;
    imageUrl: string;
    createdAt: string;
    updatedAt: string;
}

export default function MapArenaPage() {
    const params = useParams();
    const [map, setMap] = useState<Map | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        // TODO: Fetch map details from API
        // For now, using dummy data
        setMap({
            id: params.mapId as string,
            name: 'Forest Realm',
            imageUrl: '/map.jpg',
            createdAt: '2024-03-10T10:00:00Z',
            updatedAt: '2024-03-12T12:00:00Z',
        });
    }, [params.mapId]);

    if (!map) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Map not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <ArenaBottombar
                userName="John Doe"
                audioOn={true}
                videoOn={true}
                onToggleAudio={() => {}}
                onToggleVideo={() => {}}
                onChat={() => setIsChatOpen(!isChatOpen)}
                onLeave={() => {}}
                onParticipants={() => {}}
                onShareScreen={() => {}}
            />

            {/* Main Content: Map Arena and Chat Sidebar side by side */}
            <div className="flex w-full h-screen pt-5">
                {/* Map Arena */}
                <div className={`flex-1 flex items-center justify-center transition-all duration-300`}>
                    <div className="h-full w-full rounded-lg overflow-hidden border bg-muted/50 flex items-center justify-center mx-1">
                        {/* TODO: Implement the actual map arena with:
                            1. Map rendering
                            2. User avatars
                            3. Movement controls
                            4. Chat system
                            5. User interactions
                        */}
                        <p className="text-muted-foreground">Map arena coming soon...</p>
                    </div>
                </div>
                {/* Chat Sidebar */}
                {isChatOpen && (
                    <div className="h-full w-90 bg-gray-900 text-white shadow-lg flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <span className="font-bold">Chat</span>
                            <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            {/* Chat content goes here */}
                            <p className="text-muted-foreground">Chat coming soon...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
