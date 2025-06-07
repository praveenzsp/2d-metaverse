'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ArenaBottombar from '@/components/ArenaBottombar';
import MapEditSidebar from '@/components/MapEditSidebar';
import dynamic from 'next/dynamic';

const GameArena = dynamic(() => import('@/components/GameArena'), { ssr: false });

interface Map {
    id: string;
    name: string;
    imageUrl: string;
    createdAt: string;
    updatedAt: string;
}

interface MapElement {
    id: string;
    name: string;
    imageUrl: string;
    type: string;
    size: {
        width: number;
        height: number;
    };
}

export default function MapArenaPage() {
    const params = useParams();
    const [map, setMap] = useState<Map | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

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

    const handleElementDragStart = (element: MapElement) => {
        // You can add any additional logic here when drag starts
        console.log('Drag started:', element);
    };

    const handleSaveMap = () => {
        // TODO: Implement save functionality
        setIsEditMode(false);
    };

    if (!map) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Map not found</p>
            </div>
        );
    }

    // Ensure only one sidebar is open at a time
    const handleChat = () => {
        setIsChatOpen((prev) => !prev);
        setIsParticipantsOpen(false);
        setIsEditMode(false);
    };
    const handleParticipants = () => {
        setIsParticipantsOpen((prev) => !prev);
        setIsChatOpen(false);
        setIsEditMode(false);
    };

    const handleEditMap = () => {
        setIsEditMode((prev) => !prev);
        setIsChatOpen(false);
        setIsParticipantsOpen(false);
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-h-0">
                {/* Map Arena */}
                <div className="flex-1 overflow-auto">
                    <div className="h-full w-full rounded-lg overflow-hidden border bg-muted/50 flex items-center justify-center mx-1">
                        <GameArena />
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex-shrink-0">
                    <ArenaBottombar
                        userName="John Doe"
                        audioOn={true}
                        videoOn={true}
                        onToggleAudio={() => {}}
                        onToggleVideo={() => {}}
                        onChat={handleChat}
                        onLeave={() => {}}
                        onParticipants={handleParticipants}
                        onShareScreen={() => {}}
                        onEditMap={handleEditMap}
                    />
                </div>
            </div>

            {/* Chat Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-90 bg-gray-900 text-white shadow-lg flex flex-col z-30 transition-transform duration-1000 transform ${isChatOpen ? 'translate-x-0' : 'translate-x-full'} pointer-events-auto`}
                style={{ display: isChatOpen ? 'flex' : 'none' }}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <span className="font-bold">Chat</span>
                    <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <p className="text-muted-foreground">Chat coming soon...</p>
                </div>
            </div>

            {/* Participants Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-90 bg-gray-900 text-white shadow-lg flex flex-col z-30 transition-transform duration-1000 transform ${isParticipantsOpen ? 'translate-x-0' : 'translate-x-full'} pointer-events-auto`}
                style={{ display: isParticipantsOpen ? 'flex' : 'none' }}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <span className="font-bold">Participants</span>
                    <button onClick={() => setIsParticipantsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <p className="text-muted-foreground">Participants coming soon...</p>
                </div>
            </div>

            {/* Map Edit Sidebar */}
            <MapEditSidebar
                isOpen={isEditMode}
                onClose={() => setIsEditMode(false)}
                onSave={handleSaveMap}
                onElementDragStart={handleElementDragStart}
            />
        </div>
    );
}
