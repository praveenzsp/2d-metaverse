import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Maximize2, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';

interface VideoBoxProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    variant: 'small' | 'medium' | 'large';
    avatarUrl: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    showExpandButton: boolean;
    participantName?: string;
    isLocalUser?: boolean;
}

function VideoBox({ 
    videoRef, 
    variant, 
    avatarUrl, 
    videoEnabled, 
    audioEnabled, 
    showExpandButton,
    participantName = "Participant",
    isLocalUser = false
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
                        className="w-full h-full object-cover rounded-lg bg-black" 
                        autoPlay 
                        playsInline
                        muted={isLocalUser}
                        style={{ minHeight: '100px', minWidth: '100px' }}
                        onLoadedMetadata={(e) => {
                            console.log('[VideoBox] Video loaded metadata for', participantName, e.target);
                        }}
                        onCanPlay={(e) => {
                            console.log('[VideoBox] Video can play for', participantName, e.target);
                        }}
                        onError={(e) => {
                            console.error('[VideoBox] Video error for', participantName, e);
                        }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <Avatar className={`${variant === 'small' ? 'w-8 h-8' : variant === 'medium' ? 'w-12 h-12' : 'w-16 h-16'}`}>
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="bg-gray-600 text-white">
                                <User className={`${variant === 'small' ? 'w-4 h-4' : variant === 'medium' ? 'w-6 h-6' : 'w-8 h-8'}`} />
                            </AvatarFallback>
                        </Avatar>
                        <span className={`text-white text-center ${variant === 'small' ? 'text-xs' : variant === 'medium' ? 'text-sm' : 'text-base'}`}>
                            {participantName}
                        </span>
                    </div>
                )}
            </div>

            {/* Participant Name Overlay */}
            {videoEnabled && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <span className={`text-white ${variant === 'small' ? 'text-xs' : 'text-sm'} font-medium`}>
                        {participantName} {isLocalUser && '(You)'}
                    </span>
                </div>
            )}

            {/* Expand Button */}
            {showExpandButton && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 bg-black/50 rounded hover:bg-black/70 transition-colors">
                        <Maximize2 className="w-3 h-3 text-white" />
                    </button>
                </div>
            )}

            {/* Audio/Video Status Indicators */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
                {/* Audio Status */}
                <div className={`p-1 rounded-full ${audioEnabled ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
                    {audioEnabled ? (
                        <Mic className="w-3 h-3 text-white" />
                    ) : (
                        <MicOff className="w-3 h-3 text-white" />
                    )}
                </div>
                
                {/* Video Status */}
                <div className={`p-1 rounded-full ${videoEnabled ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
                    {videoEnabled ? (
                        <Video className="w-3 h-3 text-white" />
                    ) : (
                        <VideoOff className="w-3 h-3 text-white" />
                    )}
                </div>
            </div>

            {/* Local User Indicator */}
            {isLocalUser && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                    <div className="px-2 py-1 bg-blue-500/80 rounded-full">
                        <span className="text-white text-xs font-medium">You</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VideoBox;
