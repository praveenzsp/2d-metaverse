'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Map, Box, UserCircle, LogOut, Sun, Moon } from 'lucide-react';
import axios from '@/lib/axios';
import { useTheme } from 'next-themes';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface SidebarItem {
    title: string;
    href?: string;
    icon: React.ReactNode;
    onClick?: () => void;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
    const isArenaPage = pathname.includes('/arena');
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        const checkAdminAuth = async () => {
            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me`);
                if (response.data.role !== 'Admin') {
                    router.push('/dashboard');
                }
            } catch (error) {
                console.error(error);
                router.push('/signin');
            }
        };
        checkAdminAuth();
    }, [router]);

    const handleSignOut = async () => {
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/signout`);
            router.push('/signin');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const sidebarItems: SidebarItem[] = [
        {
            title: 'Dashboard',
            href: '/admin/dashboard',
            icon: <LayoutDashboard className="h-5 w-5 shrink-0" />,
        },
        {
            title: 'Users',
            href: '/admin/users',
            icon: <Users className="h-5 w-5 shrink-0" />,
        },
        {
            title: 'Maps',
            href: '/admin/maps',
            icon: <Map className="h-5 w-5 shrink-0" />,
        },
        {
            title: 'Elements',
            href: '/admin/elements',
            icon: <Box className="h-5 w-5 shrink-0" />,
        },
        {
            title: 'Avatars',
            href: '/admin/avatars',
            icon: <UserCircle className="h-5 w-5 shrink-0" />,
        },
        {
            title: theme === 'light' ? 'Dark Mode' : 'Light Mode',
            icon: theme === 'light' ? <Moon className="h-5 w-5 shrink-0" /> : <Sun className="h-5 w-5 shrink-0" />,
            onClick: () => setTheme(theme === 'light' ? 'dark' : 'light'),
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            {!isArenaPage && (
                <aside
                    className={cn(
                        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
                        isCollapsed ? 'w-16' : 'w-64',
                    )}
                >
                    {/* Toggle Sidebar header */}
                    <div className="flex h-16 items-center border-b px-4 justify-between">
                        {!isCollapsed && <h1 className="text-xl font-bold">Admin Panel</h1>}
                        <Button variant="outline" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
                            {isCollapsed ? '→' : '←'}
                        </Button>
                    </div>

                    {/* Sidebar navigation */}
                    <nav className="space-y-3 p-4">
                        {sidebarItems.map((item) => {
                            const isActive = item.href && (pathname === item.href || (item.href === '/admin' && pathname === '/admin/'));
                            return (
                                <Button
                                    key={item.title}
                                    variant="ghost"
                                    className={cn(
                                        'w-full justify-start space-x-3',
                                        isActive
                                            ? 'bg-accent text-accent-foreground'
                                            : 'hover:bg-accent hover:text-accent-foreground',
                                        isCollapsed ? 'justify-center' : '',
                                    )}
                                    onClick={item.onClick}
                                    asChild={!!item.href}
                                >
                                    {item.href ? (
                                        <Link href={item.href}>
                                            {item.icon}
                                            {!isCollapsed && <span>{item.title}</span>}
                                        </Link>
                                    ) : (
                                        <>
                                            {item.icon}
                                            {!isCollapsed && <span>{item.title}</span>}
                                        </>
                                    )}
                                </Button>
                            );
                        })}
                        <Button
                            variant="ghost"
                            className={cn('w-full justify-start space-x-3', isCollapsed ? 'justify-center' : '')}
                            onClick={() => setIsSignOutDialogOpen(true)}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            {!isCollapsed && <span>Sign Out</span>}
                        </Button>
                    </nav>
                </aside>
            )}

            {/* Sign Out Confirmation Dialog */}
            <Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sign Out</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to sign out? You will need to sign in again to access the admin panel.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSignOutDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => {
                            setIsSignOutDialogOpen(false);
                            handleSignOut();
                        }}>
                            Sign Out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Main Content */}
            <main className={cn('transition-all duration-300', !isArenaPage ? (isCollapsed ? 'ml-16' : 'ml-64') : '')}>
                {!isArenaPage ? (
                    <div className="container mx-auto p-8 mt-12">{children}</div>
                ) : (
                    children
                )}
            </main>
        </div>
    );
}
