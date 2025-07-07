import React from 'react';
import { Avatar, AvatarImage } from './ui/avatar';
import { Maximize2, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoBoxProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    variant: 'small' | 'medium' | 'large';
    avatarUrl: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    showExpandButton: boolean;
}

function VideoBox({ videoRef, variant, avatarUrl, videoEnabled, audioEnabled, showExpandButton }: VideoBoxProps) {
    return (
        <div
            className={`relative aspect-video flex flex-col items-center justify-center ${variant === 'small' ? 'w-40' : variant === 'medium' ? 'w-60' : 'w-80'} rounded-md bg-black`}
        >
            <div className="w-full h-full flex items-center justify-center">
                {videoEnabled ? (
                    <video ref={videoRef} className="w-full h-full rounded-md translate scale-x-[-1]" />
                ) : (
                    <Avatar className="w-10 h-10 rounded-full">
                        <AvatarImage src={avatarUrl} />
                    </Avatar>
                )}
            </div>

            {showExpandButton && (
                <div className="absolute top-2 right-2">
                    <Maximize2 className="w-4 h-4 text-muted-foreground cursor-pointer" />
                </div>
            )}

            <div className=" absolute bottom-2 left-2 flex flex-row items-center justify-center gap-2">
                {audioEnabled ? (
                    <Mic className="w-4 h-4 text-green-700" />
                ) : (
                    <MicOff className="w-4 h-4 text-red-700" />
                )}
                {videoEnabled ? (
                    <Video className="w-4 h-4 text-green-700" />
                ) : (
                    <VideoOff className="w-4 h-4 text-red-700" />
                )}
            </div>
        </div>
    );
}

export default VideoBox;
