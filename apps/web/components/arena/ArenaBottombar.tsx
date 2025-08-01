import React, { useRef, useState, useEffect } from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    MessageCircle,
    Users,
    // Monitor,
    LogOut,
    Edit,
    ChevronDown,
    ChevronUp,
    User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useMediaDevices from '@/hooks/useMediaDevices';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ArenaBottombarProps {
    spaceId: string;
    userId: string;
    userName: string;
    onChat: () => void;
    onLeave: () => void;
    onParticipants: () => void;
    onShareScreen: () => void;
    onEditMap: () => void;
    isAdmin?: boolean;
    isInCall?: boolean;
    callParticipantsCount?: number;
    proximityUsersCount?: number;
}

const ArenaBottombar: React.FC<ArenaBottombarProps> = ({
    userName,
    onChat,
    onLeave,
    onParticipants,
    // onShareScreen,
    onEditMap,
    isAdmin = false,
    isInCall = false,
    callParticipantsCount = 0,
    proximityUsersCount = 0,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [audioDeviceDropdownOpen, setAudioDeviceDropdownOpen] = useState(false);
    const [videoDeviceDropdownOpen, setVideoDeviceDropdownOpen] = useState(false);

    const {
        isAudioEnabled,
        isVideoEnabled,
        videoDevices,
        audioDevices,
        selectedVideoDevice,
        selectedAudioDevice,
        handleVideoToggle,
        handleAudioToggle,
        handleVideoDeviceChange,
        handleAudioDeviceChange,
    } = useMediaDevices(videoRef);

    // Clean up video element on unmount
    useEffect(() => {
        return () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
                videoRef.current.load();
            }
        };
    }, []);

    return (
        <div className="w-full min-h-18 bg-gray-900 text-white flex items-center justify-between px-40 z-50 shadow-lg min-h-md">
            {/* Left section */}
            <div className="flex items-center space-x-4">
                <span className="font-semibold text-lg">{userName}</span>
                {(isInCall || proximityUsersCount > 0) && (
                    <div className="flex items-center gap-2 text-sm">
                        {isInCall ? (
                            <div className="flex items-center gap-1 bg-green-600/20 text-green-400 px-2 py-1 rounded">
                                <span>●</span>
                                <span>In Call ({callParticipantsCount})</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                                <span>●</span>
                                <span>Nearby ({proximityUsersCount})</span>
                            </div>
                        )}
                    </div>
                )}
                <div className="w-30 h-full flex items-center justify-center">
                    {/* Always render video element for audio output, but hide it when video is disabled */}
                    <video
                        ref={videoRef}
                        className={`w-full h-full rounded-md translate scale-x-[-1] ${!isVideoEnabled ? 'hidden' : ''}`}
                        autoPlay
                    />
                    {!isVideoEnabled && (
                        <div className="w-full min-h-16 bg-black rounded-md flex items-center justify-center">
                            <User className="text-gray-400" />
                        </div>
                    )}
                </div>

                {!isAdmin && (
                    <>
                        <div className="flex items-center relative audio-dropdown">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleAudioToggle}
                                        className="p-2 rounded-l-full hover:bg-gray-800 transition-colors"
                                        aria-label="Toggle Audio"
                                        variant="outline"
                                        size="icon"
                                    >
                                        {isAudioEnabled ? (
                                            <Mic className="w-5 h-5" />
                                        ) : (
                                            <MicOff className="w-5 h-5 text-red-500" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Toggle Audio</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => setAudioDeviceDropdownOpen(!audioDeviceDropdownOpen)}
                                        className="p-2 rounded-r-full hover:bg-gray-800 transition-colors"
                                        aria-label="Audio Device Settings"
                                        variant="outline"
                                        size="icon"
                                    >
                                        {audioDeviceDropdownOpen ? (
                                            <ChevronUp className="w-5 h-5" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Audio Device Settings</p>
                                </TooltipContent>
                            </Tooltip>

                            {audioDeviceDropdownOpen && (
                                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg p-2 min-w-48">
                                    <Select
                                        value={selectedAudioDevice?.deviceId}
                                        onValueChange={handleAudioDeviceChange}
                                    >
                                        <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                                            <SelectValue placeholder="Select microphone" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-600">
                                            {audioDevices.map((device) => (
                                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center relative video-dropdown">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleVideoToggle}
                                        className="p-2 rounded-l-full hover:bg-gray-800 transition-colors"
                                        aria-label="Toggle Video"
                                        variant="outline"
                                        size="icon"
                                    >
                                        {isVideoEnabled ? (
                                            <Video className="w-5 h-5" />
                                        ) : (
                                            <VideoOff className="w-5 h-5 text-red-500" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Toggle Video</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => setVideoDeviceDropdownOpen(!videoDeviceDropdownOpen)}
                                        className="p-2 rounded-r-full hover:bg-gray-800 transition-colors"
                                        aria-label="Video Device Settings"
                                        variant="outline"
                                        size="icon"
                                    >
                                        {videoDeviceDropdownOpen ? (
                                            <ChevronUp className="w-5 h-5" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Video Device Settings</p>
                                </TooltipContent>
                            </Tooltip>

                            {videoDeviceDropdownOpen && (
                                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg p-2 min-w-48">
                                    <Select
                                        value={selectedVideoDevice?.deviceId}
                                        onValueChange={handleVideoDeviceChange}
                                    >
                                        <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                                            <SelectValue placeholder="Select camera" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-600">
                                            {videoDevices.map((device) => (
                                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={onShareScreen}
                                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                                    aria-label="Share Screen"
                                    variant="outline"
                                    size="icon"
                                >
                                    <Monitor className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Share Screen</p>
                            </TooltipContent>
                        </Tooltip> */}
                    </>
                )}
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-4">
                {isAdmin ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={onEditMap}
                                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                                aria-label="Edit Map"
                                variant="outline"
                                size="icon"
                            >
                                <Edit className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Edit Map</p>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={onChat}
                                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                                    aria-label="Chat"
                                    variant="outline"
                                    size="icon"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Chat</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={onParticipants}
                                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                                    aria-label="Participants"
                                    variant="outline"
                                    size="icon"
                                >
                                    <Users className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Participants</p>
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={onLeave}
                            className="p-2 rounded-full hover:bg-red-700 bg-red-600 transition-colors"
                            aria-label="Leave Meeting"
                            variant="destructive"
                            size="icon"
                        >
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Exit Space</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};

export default ArenaBottombar;
