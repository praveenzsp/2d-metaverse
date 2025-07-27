import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings } from 'lucide-react';
import { Button } from './ui/button';

interface CallControlsProps {
    isInCall: boolean;
    audioEnabled: boolean;
    videoEnabled: boolean;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onLeaveCall: () => void;
    participantCount: number;
}

export const CallControls: React.FC<CallControlsProps> = ({
    isInCall,
    audioEnabled,
    videoEnabled,
    onToggleAudio,
    onToggleVideo,
    onLeaveCall,
    participantCount,
}) => {
    if (!isInCall) return null;

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className="flex items-center gap-3 bg-gray-900/90 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-700 shadow-lg">
                {/* Audio Toggle */}
                {/* <Button
                    onClick={onToggleAudio}
                    variant="ghost"
                    size="sm"
                    className={`rounded-full p-2 ${audioEnabled ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                >
                    {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button> */}

                {/* Video Toggle */}
                {/* <Button
                    onClick={onToggleVideo}
                    variant="ghost"
                    size="sm"
                    className={`rounded-full p-2 ${videoEnabled ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                >
                    {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </Button> */}

                {/* Participant Count */}
                <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                    {participantCount} participant{participantCount !== 1 ? 's' : ''}
                </div>

                {/* Settings */}
                {/* <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-700/50"
                >
                    <Settings className="w-4 h-4" />
                </Button> */}

                {/* Leave Call */}
                <Button
                    onClick={onLeaveCall}
                    variant="destructive"
                    size="sm"
                    className="rounded-full p-2 bg-red-600 hover:bg-red-700"
                >
                    <PhoneOff className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}; 