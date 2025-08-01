'use client';

import { Button } from '@/components/ui/button';
import { Link, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ArenaTopBarProps {
    spaceName: string;
    isMeetingViewEnabled: boolean;
    setIsMeetingViewEnabled: (isMeetingViewEnabled: boolean) => void;
}

export default function ArenaTopBar({ spaceName, isMeetingViewEnabled, setIsMeetingViewEnabled }: ArenaTopBarProps) {

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard', {
            description: 'You can now share this link with others',
            duration: 2000,
        });
    };

    return (
        <div className="w-screen min-h-10 bg-gray-900">
            <div className="flex flex-row justify-between items-center px-4">
                {/* Left side - Back button */}
                <div className="flex items-center">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleCopyLink} className="hover:bg-accent">
                                <Link className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Copy Link</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Center - Space name */}
                <div className="flex-1 flex justify-center">
                    <h1 className="text-sm font-semibold text-muted-foreground truncate max-w-xs">{spaceName}</h1>
                </div>

                {/* Right side - Settings button */}
                <div className="flex items-center">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => {
                                setIsMeetingViewEnabled(!isMeetingViewEnabled);
                            }} className="hover:bg-accent">
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isMeetingViewEnabled ? 'Map View' : 'Meeting View'}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
