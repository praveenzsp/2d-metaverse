'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Map, Box, UserCircle, LogOut } from 'lucide-react';
import axios from '@/lib/axios';

interface SidebarItem {
    title: string;
    href: string;
    icon: React.ReactNode;
}

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
    }
    // {
    //     title: 'Analytics',
    //     href: '/admin/analytics',
    //     icon: <BarChart className="h-5 w-5 shrink-0" />,
    // },
    // {
    //     title: 'Reports',
    //     href: '/admin/reports',
    //     icon: <Flag className="h-5 w-5 shrink-0" />,
    // },
    // {
    //     title: 'Settings',
    //     href: '/admin/settings',
    //     icon: <Settings className="h-5 w-5 shrink-0" />,
    // },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

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

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
                    isCollapsed ? 'w-16' : 'w-64',
                )}
            >   
                {/* Toggle Sidebar header */}
                <div className="flex h-16 items-center border-b px-4 justify-between">
                    {!isCollapsed && <h1 className="text-xl font-bold">Admin Panel</h1>}
                    <Button
                        variant="outline"
                        size="icon"
                        className=""
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? '→' : '←'}
                    </Button>
                </div>

                {/* Sidebar navigation */}
                <nav className="space-y-3 p-4">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || 
                            (item.href === '/admin' && pathname === '/admin/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive 
                                        ? 'bg-accent text-accent-foreground' 
                                        : 'hover:bg-accent hover:text-accent-foreground',
                                    isCollapsed ? 'justify-center' : '',
                                )}
                            >
                                {item.icon}
                                {!isCollapsed && <span>{item.title}</span>}
                            </Link>
                        );
                    })}
                    <Button
                        variant="ghost"
                        className={cn('w-full justify-start space-x-3', isCollapsed ? 'justify-center' : '')}
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span>Sign Out</span>}
                    </Button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className={cn('transition-all duration-300', isCollapsed ? 'ml-16' : 'ml-64')}>
                <div className="container mx-auto p-8 mt-12">{children}</div>
            </main>
        </div>
    );
}
