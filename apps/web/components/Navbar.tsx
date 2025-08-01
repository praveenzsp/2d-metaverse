'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Github } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function Navbar() {
    const currentRoute = usePathname();
    const { logout } = useAuth();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [navLinkText, setNavLinkText] = useState(currentRoute === '/user/profile' ? 'Profile' : 'Spaces');

    const handleSignOut = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    useEffect(() => {
        setNavLinkText(currentRoute === '/user/profile' ? 'Spaces' : 'Profile');
    }, [currentRoute]);

    return (
        <nav className="border-b">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center space-x-8">
                    <Link href="/" className="text-xl font-bold">
                        Metaverse
                    </Link>
                </div>
                <div className="flex items-center space-x-4">
                    <ThemeToggle />
                    <div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className=""
                                    onClick={() => window.open('https://github.com/praveenzsp/2d-metaverse', '_blank')}
                                >
                                    <Github className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>View on GitHub</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="hidden md:flex space-x-6">
                        <Link
                            href={currentRoute === '/user/profile' ? '/user/dashboard' : '/user/profile'}
                            className="text-sm font-medium hover:text-primary"
                        >
                            {navLinkText}
                        </Link>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="hover:text-red-500">
                                Sign Out
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Sign Out</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to sign out? You will need to sign in again to access your
                                    account.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setIsDialogOpen(false);
                                        handleSignOut();
                                    }}
                                >
                                    Sign Out
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </nav>
    );
}
