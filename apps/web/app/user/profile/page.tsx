'use client';

import { Navbar } from '@/components/Navbar';
import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface UserProfile {
    id: string;
    username: string;
    email: string;
    avatar: {
        id: string;
        imageUrl: string;
    } | null;
}

interface Avatar {
    id: string;
    imageUrl: string;
    name: string;
}

function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchProfile();
        fetchAvatars();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/profile`);
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvatars = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/avatars`);
            setAvatars(response.data);
        } catch (error) {
            console.error('Error fetching avatars:', error);
        }
    };

    const updateAvatar = async (avatarId: string) => {
        setIsUpdating(true);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/metadata`, {
                avatarId,
            });
            await fetchProfile();
            setIsDialogOpen(false);
        } catch (error) {
            console.error('Error updating avatar:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader className="border-b-1 border-gray-700 pb-4">
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Manage your profile information and avatar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center space-y-6">
                            <div className="w-full space-y-4 mx-5">
                                <div className="text-center">
                                    <h3 className="text-sm font-medium">Username</h3>
                                    <p className="text-lg">{profile?.username}</p>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-sm font-medium">Email</h3>
                                    <p className="text-lg">{profile?.email}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center space-y-2">
                                <Avatar className="h-30 w-30">
                                    <AvatarImage src={profile?.avatar?.imageUrl} />
                                    <AvatarFallback>{profile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">Change Avatar</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Select Avatar</DialogTitle>
                                            <DialogDescription>
                                                Choose a new avatar from the available options
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid grid-cols-3 gap-4 py-4">
                                            {avatars.map((avatar) => (
                                                <div
                                                    key={avatar.id}
                                                    className="relative cursor-pointer group"
                                                    onClick={() => updateAvatar(avatar.id)}
                                                >
                                                    <Avatar className="h-30 w-30 mx-auto">
                                                        <AvatarImage src={avatar.imageUrl} />
                                                        <AvatarFallback>{avatar.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                                                        {isUpdating ? (
                                                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                                                        ) : (
                                                            <span className="text-white text-sm">Select</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default ProfilePage;
