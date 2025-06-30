'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Video, VideoOff, ArrowLeft, Loader2 } from 'lucide-react';
import axios from '@/lib/axios';
import useMediaDevices from '@/hooks/useMediaDevices';

interface SpaceElement {
    id: string;
    element: {
        id: string;
        image: string;
        height: number;
        width: number;
        static: boolean;
    };
    x: number;
    y: number;
}

interface SpaceData {
    name: string;
    dimensions: string;
    elements: SpaceElement[];
}

export default function JoinPreviewPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const spaceId = searchParams.get('spaceId');


    const [joiningSpace, setJoiningSpace] = useState<SpaceData | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const fetchSpaceInfo = async () => {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/${spaceId}`);
            setJoiningSpace(response.data);
        };
        fetchSpaceInfo();
    }, [spaceId]);

    //   video: {
    //     facingMode: 'user',
    //     width: { ideal: 1280 },
    //     height: { ideal: 720 },
    //   },
    //   audio: {
    //     echoCancellation: true,
    //     noiseSuppression: true,
    //     autoGainControl: true,
    //   },
    // }), []);

    // const getUserStream = useCallback(async () => {
    //   return await navigator.mediaDevices.getUserMedia(constraints);
    // }, [constraints])

    // useEffect(() => {
    //   const fetchStream = async () => {
    //     const userStream = await getUserStream();
    //     setStream(userStream);
    //     if(videoRef.current){
    //       videoRef.current.srcObject = userStream;
    //       videoRef.current.play();
    //     }
    //   };
    //   fetchStream();
    // }, [getUserStream])

    // useEffect(()=>{
    //   const fetchDevices = async ()=>{
    //     const devices = await navigator.mediaDevices.enumerateDevices();
    //     const videoInputs = devices.filter(device => device.kind === 'videoinput');
    //     const audioInputs = devices.filter(device => device.kind === 'audioinput');

    //     setVideoDevices(videoInputs);
    //     setAudioDevices(audioInputs);
    //     // Set initial selected devices
    //     if (videoInputs.length > 0 && !selectedVideoDevice) {
    //       setSelectedVideoDevice(videoInputs[0]);
    //     }
    //     if (audioInputs.length > 0 && !selectedAudioDevice) {
    //       setSelectedAudioDevice(audioInputs[0]);
    //     }
    //   }
    //   fetchDevices();
    // }, [selectedVideoDevice, selectedAudioDevice])

    // useEffect(()=>{
    //   const mediaConfig = {
    //     video: isVideoEnabled,
    //     audio: isAudioEnabled,
    //   }
    //   localStorage.setItem('mediaConfig', JSON.stringify(mediaConfig));
    // }, [isVideoEnabled, isAudioEnabled])

    // const handleVideoToggle = async ()=>{
    //   if(!stream) return;
    //   if(isVideoEnabled){
    //     const videoTrack = stream.getVideoTracks()[0];
    //     videoTrack.stop();
    //     stream.removeTrack(videoTrack);
    //     setIsVideoEnabled(false);
    //   }
    //   else{
    //     const newVideoStream = await navigator.mediaDevices.getUserMedia({
    //       video: {
    //         deviceId: { exact: selectedVideoDevice?.deviceId },
    //         facingMode: 'user',
    //         width: { ideal: 1280 },
    //         height: { ideal: 720 },
    //       }
    //     });

    //     const newVideoTrack = newVideoStream.getVideoTracks()[0];
    //     stream.addTrack(newVideoTrack);

    //     if (videoRef.current) {
    //       videoRef.current.srcObject = stream;
    //       videoRef.current.play();
    //     }
    //     setIsVideoEnabled(!isVideoEnabled);
    //   }
    // };

    // const handleAudioToggle = async () => {
    //   if (!stream) return;
    //   if (isAudioEnabled) {
    //     const audioTrack = stream.getAudioTracks()[0];
    //     audioTrack.stop();
    //     stream.removeTrack(audioTrack);
    //     setIsAudioEnabled(false);
    //   } else {
    //       const newAudioStream = await navigator.mediaDevices.getUserMedia({ audio: {
    //         deviceId: { exact: selectedAudioDevice?.deviceId },
    //         echoCancellation: true,
    //         noiseSuppression: true,
    //         autoGainControl: true,
    //       } });

    //       const newAudioTrack = newAudioStream.getAudioTracks()[0];
    //       stream.addTrack(newAudioTrack);

    //       if (videoRef.current) {
    //         videoRef.current.srcObject = stream;
    //         videoRef.current.play();
    //       }
    //       setIsAudioEnabled(true);
    //   }
    // };

    // const handleJoinSpace = async () => {
    //   setIsJoining(true);
    //   try {
    //     router.push(`/user/space?spaceId=${spaceId}`);
    //   } catch (error) {
    //     console.error('Error joining space:', error);
    //   } finally {
    //     setIsJoining(false);
    //   }
    // };

    // const handleVideoDeviceChange = async (deviceId: string) => {
    //   const device = videoDevices.find(d => d.deviceId === deviceId);
    //   if (device) {
    //     setSelectedVideoDevice(device);
    //     // Update stream with new video device
    //     if (stream) {
    //       const newStream = await navigator.mediaDevices.getUserMedia({
    //         video: {
    //           deviceId: { exact: deviceId },
    //           facingMode: 'user',
    //           width: { ideal: 1280 },
    //           height: { ideal: 720 },
    //         },
    //         audio: isAudioEnabled ? {
    //           echoCancellation: true,
    //           noiseSuppression: true,
    //           autoGainControl: true,
    //         } : false,
    //       });
    //       setStream(newStream);
    //       if (videoRef.current) {
    //         videoRef.current.srcObject = newStream;
    //         videoRef.current.play();
    //       }
    //     }
    //   }
    // };

    // const handleAudioDeviceChange = async (deviceId: string) => {
    //   const device = audioDevices.find(d => d.deviceId === deviceId);
    //   if (device) {
    //     setSelectedAudioDevice(device);
    //     // Update stream with new audio device
    //     if (stream && isAudioEnabled) {
    //       const newStream = await navigator.mediaDevices.getUserMedia({
    //         video: isVideoEnabled ? {
    //           facingMode: 'user',
    //           width: { ideal: 1280 },
    //           height: { ideal: 720 },
    //         } : false,
    //         audio: {
    //           deviceId: { exact: deviceId },
    //           echoCancellation: true,
    //           noiseSuppression: true,
    //           autoGainControl: true,
    //         },
    //       });
    //       setStream(newStream);
    //       if (videoRef.current) {
    //         videoRef.current.srcObject = newStream;
    //         videoRef.current.play();
    //       }
    //     }
    //   }
    // };
    const handleJoinSpace = async () => {
        setIsJoining(true);
        try {
            router.push(`/user/space?spaceId=${spaceId}`);
        } catch (error) {
            console.error('Error joining space:', error);
        } finally {
            setIsJoining(false);
        }
    };

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

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Simple Header */}
            <div className="border-b px-6 py-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-lg font-medium">Join Space</h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8">
                    <p className="text-sm text-muted-foreground text-center">
                        You are trying to join <span className="font-medium">{joiningSpace?.name}</span>
                    </p>
                    {/* Video Preview */}
                    <div className="">
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border overflow-hidden">
                            <video
                                className="w-full h-full object-cover translate scale-x-[-1]"
                                autoPlay
                                ref={videoRef}
                            />
                        </div>
                    </div>

                    {/* Simple Controls */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                {isAudioEnabled ? (
                                    <Mic className="h-4 w-4" />
                                ) : (
                                    <MicOff className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm">Microphone</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {audioDevices.length > 0 && (
                                    <Select
                                        value={selectedAudioDevice?.deviceId}
                                        onValueChange={handleAudioDeviceChange}
                                    >
                                        <SelectTrigger className="w-32 h-8 text-xs">
                                            <SelectValue placeholder="Select mic" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {audioDevices.map((device) => (
                                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Button variant="outline" size="sm" onClick={handleAudioToggle} className="h-8 px-3">
                                    {isAudioEnabled ? 'On' : 'Off'}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                {isVideoEnabled ? (
                                    <Video className="h-4 w-4" />
                                ) : (
                                    <VideoOff className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm">Camera</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {videoDevices.length > 0 && (
                                    <Select
                                        value={selectedVideoDevice?.deviceId}
                                        onValueChange={handleVideoDeviceChange}
                                    >
                                        <SelectTrigger className="w-32 h-8 text-xs">
                                            <SelectValue placeholder="Select camera" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {videoDevices.map((device) => (
                                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Button variant="outline" size="sm" onClick={handleVideoToggle} className="h-8 px-3">
                                    {isVideoEnabled ? 'On' : 'Off'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4">
                        <Button onClick={handleJoinSpace} className="w-full">
                            {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ''}
                            Join Space
                        </Button>
                        <Button variant="outline" onClick={() => router.back()} className="w-full">
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
