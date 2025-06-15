import React from 'react';
import { Mic, MicOff, Video, VideoOff, MessageCircle, Users, Monitor, LogOut, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArenaBottombarProps {
    userName: string;
    audioOn: boolean;
    videoOn: boolean;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onChat: () => void;
    onLeave: () => void;
    onParticipants: () => void;
    onShareScreen: () => void;
    onEditMap: () => void;
    isAdmin?: boolean;
}

const ArenaBottombar: React.FC<ArenaBottombarProps> = ({
    userName,
    audioOn,
    videoOn,
    onToggleAudio,
    onToggleVideo,
    onChat,
    onLeave,
    onParticipants,
    onShareScreen,
    onEditMap,
    isAdmin = false,
}) => {
    return (
        <div className="absolute bottom-0 left-0 w-full bg-gray-900 text-white flex items-center justify-between px-40 py-3 z-50 shadow-lg">
            {/* Left section */}
            <div className="flex items-center space-x-4">
                <span className="font-semibold text-lg">{userName}</span>
                {!isAdmin && (
                    <>
                <Button
                    onClick={onToggleAudio}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                    aria-label="Toggle Audio"
                    variant="outline"
                    size="icon"
                >
                    {audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-red-500" />}
                </Button>
                <Button
                    onClick={onToggleVideo}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                    aria-label="Toggle Video"
                    variant="outline"
                    size="icon"
                >
                    {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-red-500" />}
                </Button>
                <Button
                    onClick={onShareScreen}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                    aria-label="Share Screen"
                    variant="outline"
                    size="icon"
                >
                    <Monitor className="w-5 h-5" />
                </Button>
                    </>
                )}
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-4">
                {isAdmin ? (
                <Button
                    onClick={onEditMap}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                    aria-label="Edit Map"
                    variant="outline"
                    size="icon"
                >
                    <Edit className="w-5 h-5" />
                </Button>
                ) : (
                    <>
                <Button
                    onClick={onChat}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                    aria-label="Chat"
                    variant="outline"
                    size="icon"
                >
                    <MessageCircle className="w-5 h-5" />
                </Button>
                <Button
                    onClick={onParticipants}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                    aria-label="Participants"
                    variant="outline"
                    size="icon"
                >
                    <Users className="w-5 h-5" />
                </Button>
                    </>
                )}
                <Button
                    onClick={onLeave}
                    className="p-2 rounded-full hover:bg-red-700 bg-red-600 transition-colors"
                    aria-label="Leave Meeting"
                    variant="destructive"
                    size="icon"
                >
                    <LogOut className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

export default ArenaBottombar;
 