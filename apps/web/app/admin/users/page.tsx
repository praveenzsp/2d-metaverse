'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Search } from 'lucide-react';
// import axios from '@/lib/axios'; // Commented out for now
import { cn } from '@/lib/utils';

interface User {
    id: string;
    username: string;
    role: 'Admin' | 'User';
    avatar?: {
        imageUrl: string;
    };
    createdAt: string;
}

// Dummy user data
const dummyUsers: User[] = [
    {
        id: '1',
        username: 'john.doe@example.com',
        role: 'Admin',
        avatar: {
            imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        },
        createdAt: '2024-01-15T10:30:00Z'
    },
    {
        id: '2',
        username: 'jane.smith@example.com',
        role: 'User',
        avatar: {
            imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
        },
        createdAt: '2024-02-20T14:45:00Z'
    },
    {
        id: '3',
        username: 'bob.wilson@example.com',
        role: 'User',
        avatar: {
            imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
        },
        createdAt: '2024-03-05T09:15:00Z'
    },
    {
        id: '4',
        username: 'alice.johnson@example.com',
        role: 'Admin',
        avatar: {
            imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        },
        createdAt: '2024-03-10T16:20:00Z'
    }
];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>(dummyUsers);
    const [searchQuery, setSearchQuery] = useState('');
    // const [isLoading, setIsLoading] = useState(false); // Removed since we're not using it with dummy data

    // useEffect(() => {
    //     // fetchUsers(); // Commented out API call for now
    // }, []);

    // const fetchUsers = async () => {
    //     /* Commented out API logic for future use */
    // };

    const handleRoleChange = async (userId: string, newRole: 'Admin' | 'User') => {
        /* Commented out API logic for future use */
        // Update local state only
        setUsers(users.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
        ));
    };

    const filteredUsers = users.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Users</h1>
                    <p className="text-muted-foreground">
                        Manage your platform users and their roles
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="w-[70px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                    No users found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            {user.avatar?.imageUrl ? (
                                                <Image
                                                    src='/images/avatar.png'
                                                    alt={user.username}
                                                    width={32}
                                                    height={32}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-muted" />
                                            )}
                                            <span>{user.username}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={cn(
                                                'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                                                user.role === 'Admin'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            )}
                                        >
                                            {user.role}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {user.role === 'User' ? (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleRoleChange(user.id, 'Admin')
                                                        }
                                                    >
                                                        Make Admin
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleRoleChange(user.id, 'User')
                                                        }
                                                    >
                                                        Make User
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem className="text-red-600">
                                                    Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}