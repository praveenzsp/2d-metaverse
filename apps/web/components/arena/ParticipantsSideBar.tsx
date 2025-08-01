'use client';

import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export interface Participant {
    id: string;
    username: string;
    avatarUrl: string | null;
}

interface ParticipantsSideBarProps {
    isOpen: boolean;
    onClose: () => void;
    participants: Participant[];
    currentUserId: string;
}

const ParticipantsSideBar: React.FC<ParticipantsSideBarProps> = ({ isOpen, onClose, participants, currentUserId }) => {
    const [searchQuery, setSearchQuery] = useState('');
    if(!participants){
        participants=[{id: '1', username: 'John Doe', avatarUrl: 'https://via.placeholder.com/150'}]
    };

    if (!isOpen) return null;

    const filteredParticipants = participants.filter((participant) =>
        participant.username.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Sort participants to show current user first
    const sortedParticipants = filteredParticipants.sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
    });

    const getInitials = (username: string) => {
        return username
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 text-white shadow-xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Participants</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-800">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-800">
                    <input
                        type="text"
                        placeholder="Search participants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-800 rounded-md border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {sortedParticipants.length > 0 ? (
                        <div className="p-4 space-y-2">
                            {sortedParticipants.map((participant) => (
                                <div
                                    key={participant.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <div className="relative">
                                        <Avatar className="w-10 h-10">
                                                <AvatarImage src={participant.avatarUrl || ''} alt={participant.username} />
                                                <AvatarFallback className="text-sm bg-gray-700 text-white">
                                                {getInitials(participant.username)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 bg-green-500" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium truncate">{participant.username}</span>
                                            {participant.id === currentUserId && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-gray-400 text-sm">
                                {searchQuery ? 'No participants found' : 'No participants yet'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParticipantsSideBar;
