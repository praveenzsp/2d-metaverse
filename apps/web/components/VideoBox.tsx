import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Maximize2, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';

interface VideoBoxProps {
    username: string;
    videoRef: React.RefObject<HTMLVideoElement>;
    variant: 'small' | 'medium' | 'large';
    avatarUrl: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    showExpandButton: boolean;
    isLocalUser?: boolean;
    toggleVideo?: () => void;
    toggleAudio?: () => void;
}

function VideoBox({ 
    username='User',
    videoRef, 
    variant, 
    avatarUrl, 
    videoEnabled, 
    audioEnabled, 
    showExpandButton,
    isLocalUser = false,
    toggleVideo,
    toggleAudio
}: VideoBoxProps) {
    const getVariantClasses = () => {
        switch (variant) {
            case 'small':
                return 'w-32 h-20';
            case 'medium':
                return 'w-48 h-32';
            case 'large':
                return 'w-64 h-40';
            default:
                return 'w-48 h-32';
        }
    };

    return (
        <div className={`relative ${getVariantClasses()} rounded-lg bg-gray-900 border border-gray-700 shadow-lg overflow-hidden group`}>
            {/* Video or Avatar */}
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                {videoEnabled ? (
                    <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover rounded-lg bg-black translate scale-x-[-1]" 
                        autoPlay 
                        playsInline
                        muted={isLocalUser}
                        style={{ minHeight: '100px', minWidth: '100px' }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <Avatar className={`${variant === 'small' ? 'w-8 h-8' : variant === 'medium' ? 'w-12 h-12' : 'w-16 h-16'}`}>
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="bg-gray-600 text-white">
                                <User className={`${variant === 'small' ? 'w-4 h-4' : variant === 'medium' ? 'w-6 h-6' : 'w-8 h-8'}`} />
                            </AvatarFallback>
                        </Avatar>
                    </div>
                )}
            </div>

            {/* Participant Name Overlay */}
            {!videoEnabled && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100">
                    <span className={`text-white ${variant === 'small' ? 'text-xs' : 'text-sm'} font-medium`}>
                        {username}
                    </span>
                </div>
            )}

            {videoEnabled && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className={`text-white ${variant === 'small' ? 'text-xs' : 'text-sm'} font-medium`}>
                        {username}
                    </span>
                </div>
            )}

            {/* Expand Button */}
            {showExpandButton && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 bg-black/50 rounded hover:bg-black/70 transition-colors cursor-pointer">
                        <Maximize2 className="w-3 h-3 text-white" />
                    </button>
                </div>
            )}

            {/* Audio/Video Status Indicators */}
            <div className="absolute bottom-2 right-2 flex flex-row gap-1">
                {/* Audio Status */}
                <div className={`p-1 rounded-full ${isLocalUser ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={toggleAudio}>
                    {audioEnabled ? (
                        <Mic className="w-3 h-3 text-white" />
                    ) : (
                        <MicOff className="w-3 h-3 text-white" />
                    )}
                </div>
                
                {/* Video Status */}
                <div className={`p-1 rounded-full ${isLocalUser ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={toggleVideo}>
                    {videoEnabled ? (
                        <Video className="w-3 h-3 text-white" />
                    ) : (
                        <VideoOff className="w-3 h-3 text-white" />
                    )}
                </div>
            </div>
        </div>
    );
}

export default VideoBox;
