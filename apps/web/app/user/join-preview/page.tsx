'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, ArrowLeft } from 'lucide-react';

export default function JoinPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spaceId = searchParams.get('spaceId');

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const handleJoinSpace = () => {
    // TODO: Implement actual join logic
    router.push(`/user/space?spaceId=${spaceId}`);
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-medium">Join Space</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Video Preview */}
          <div className="">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border overflow-hidden">
              {isVideoEnabled ? (
                <div className="text-center">
                  <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Camera preview</p>
                </div>
              ) : (
                <div className="text-center">
                  <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Camera off</p>
                </div>
              )}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className="h-8 px-3"
              >
                {isAudioEnabled ? 'On' : 'Off'}
              </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                className="h-8 px-3"
              >
                {isVideoEnabled ? 'On' : 'Off'}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleJoinSpace}
              className="w-full"
            >
              Join Space
            </Button>
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}