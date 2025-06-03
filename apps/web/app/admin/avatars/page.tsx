'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Upload, Trash2, Plus } from 'lucide-react';
// import axios from '@/lib/axios'; // Commented out for now

interface Avatar {
    id: string;
    name: string;
    imageUrl: string;
    category: string;
    createdAt: string;
}

// Dummy data for now
const dummyAvatars: Avatar[] = [
    {
        id: '1',
        name: 'Classic Avatar',
        imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Classic',
        category: 'Default',
        createdAt: '2024-03-15T10:00:00Z',
    },
    {
        id: '2',
        name: 'Pixel Art',
        imageUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel',
        category: 'Pixel',
        createdAt: '2024-03-15T11:00:00Z',
    },
    {
        id: '3',
        name: 'Bot Avatar',
        imageUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bot',
        category: 'Bot',
        createdAt: '2024-03-15T12:00:00Z',
    },
    {
        id: '4',
        name: 'Adventurer',
        imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Adventurer',
        category: 'Fantasy',
        createdAt: '2024-03-15T13:00:00Z',
    },
];

export default function AvatarsPage() {
    const [avatars, setAvatars] = useState<Avatar[]>(dummyAvatars);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [avatarToDelete, setAvatarToDelete] = useState<Avatar | null>(null);

    // const fetchAvatars = async () => {
    //     try {
    //         const response = await axios.get('/api/v1/admin/avatars');
    //         setAvatars(response.data);
    //     } catch (error) {
    //         console.error('Error fetching avatars:', error);
    //     }
    // };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        // Simulate upload for now
        setUploadProgress(0);
        const interval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsUploadDialogOpen(false);
                    // Add new avatar to the list
                    const newAvatar: Avatar = {
                        id: Date.now().toString(),
                        name: selectedFile.name.split('.')[0],
                        imageUrl: URL.createObjectURL(selectedFile),
                        category: 'Custom',
                        createdAt: new Date().toISOString(),
                    };
                    setAvatars([...avatars, newAvatar]);
                    setSelectedFile(null);
                    return 100;
                }
                return prev + 10;
            });
        }, 200);

        /* Commented out actual upload logic for now
        try {
            const formData = new FormData();
            formData.append('avatar', selectedFile);
            await axios.post('/api/v1/admin/avatars', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const progress = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;
                    setUploadProgress(progress);
                },
            });
            await fetchAvatars();
            setIsUploadDialogOpen(false);
        } catch (error) {
            console.error('Error uploading avatar:', error);
        }
        */
    };

    const handleDelete = async (avatarId: string) => {
        // Update local state for now
        setAvatars(avatars.filter((avatar) => avatar.id !== avatarId));
        setAvatarToDelete(null);

        /* Commented out actual delete logic for now
        try {
            await axios.delete(`/api/v1/admin/avatars/${avatarId}`);
            await fetchAvatars();
        } catch (error) {
            console.error('Error deleting avatar:', error);
        }
        */
    };

    const filteredAvatars = avatars.filter(
        (avatar) =>
            avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            avatar.category.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  return (
        /**
         * UI Structure:
         * 1. Main Container (space-y-6)
         *    ├── Header Section
         *    │   ├── Title & Description
         *    │   └── Upload Button (with Dialog)
         *    │       ├── File Input
         *    │       ├── Image Preview
         *    │       └── Upload Progress
         *    │
         *    ├── Search Section
         *    │   └── Search Input with Icon
         *    │
         *    ├── Avatar Grid
         *    │   └── Avatar Cards (responsive grid)
         *    │       ├── Card Header (name)
         *    │       ├── Card Content (image)
         *    │       └── Card Footer (metadata + actions)
         *    │
         *    └── Empty State (when no results)
         */
        <div className="space-y-6">
            {/* Header section with title and description */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Avatar Management</h1>
                    <p className="text-muted-foreground">Manage and upload custom avatars for your platform</p>
                </div>
                {/* Search and Upload section */}
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search avatars..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Upload Avatar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload New Avatar</DialogTitle>
                                <DialogDescription>
                                    Upload a new avatar image. Supported formats: PNG, JPG, SVG (max 2MB)
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="avatar">Avatar Image</Label>
                                    <Input
                                        id="avatar"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="cursor-pointer"
                                    />
                                </div>
                                {selectedFile && (
                                    <div className="space-y-2">
                                        <Label>Preview</Label>
                                        <div className="relative h-32 w-32 rounded-lg overflow-hidden border">
                                            <Image
                                                src={URL.createObjectURL(selectedFile)}
                                                alt="Preview"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                                {uploadProgress > 0 && (
                                    <div className="space-y-2">
                                        <Label>Upload Progress</Label>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpload} disabled={!selectedFile || uploadProgress > 0}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Avatar grid section */}
            <div className="flex flex-wrap gap-6">
                {filteredAvatars.map((avatar) => (
                    <Card
                        key={avatar.id}
                        className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 flex-[1_1_300px] max-w-[calc(25%-18px)]"
                    >
                        <CardHeader className="!p-3 !pb-1">
                            <CardTitle className="text-lg font-medium truncate">{avatar.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="!p-3 !pt-1">
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted/50 transition-transform group-hover:scale-[1.02]">
                                <Image
                                    src="/nft.png"
                                    alt={avatar.name}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </CardContent>
                        <CardFooter className="!p-3 !pt-1 !gap-1">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col !gap-0.5">
                                    <span className="text-sm font-medium">{avatar.category}</span>
                                    <span className="text-xs text-muted-foreground">
                                        Added {new Date(avatar.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                                        onClick={() => setAvatarToDelete(avatar)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!avatarToDelete} onOpenChange={(open) => !open && setAvatarToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Avatar</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &ldquo;{avatarToDelete?.name}&rdquo;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAvatarToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => avatarToDelete && handleDelete(avatarToDelete.id)}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {filteredAvatars.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No avatars found</p>
                </div>
            )}
        </div>
    );
}
