'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { Search, Upload, Plus, Loader2 } from 'lucide-react';
import { uploadImage, deleteImage } from '@/utils/storage';
import axios from '@/lib/axios';

interface Avatar {
    id: string;
    name: string;
    imageUrl: string;
}

export default function AvatarsPage() {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [avatarToDelete, setAvatarToDelete] = useState<Avatar | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [avatarName, setAvatarName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchAvatars();
    }, []);

    const fetchAvatars = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/avatars`);
            setAvatars(response.data.avatars);
        } catch (error) {
            console.error('Error fetching avatars:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !avatarName.trim()) return;
        setIsUploading(true);
        try {
            // First upload the image to Supabase
            const { path, error } = await uploadImage(
                selectedFile,
                'avatars',
                '', // empty path to store directly in avatars bucket
            );

            if (error) {
                console.error('Error uploading avatar:', error);
                return;
            }

            console.log('File uploaded successfully to:', path);

            // Then store the metadata in the database
            try {
                const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/avatar`, {
                    imageUrl: path,
                    name: avatarName.trim(),
                });

                // Add new avatar to the list with the database ID
                const newAvatar: Avatar = {
                    id: response.data.avatarId,
                    name: avatarName.trim(),
                    imageUrl: path,
                };

                setAvatars([...avatars, newAvatar]);
                setSelectedFile(null);
                setAvatarName('');
                setIsUploadDialogOpen(false);
            } catch (apiError) {
                console.error('Error saving avatar metadata:', apiError);
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (avatarId: string) => {
        try {
            setIsDeleting(true);
            // Find the avatar to delete
            const avatar = avatars.find(a => a.id === avatarId);
            if (!avatar) {
                console.error('Avatar not found');
                return;
            }

            // First delete from storage
            // Extract the file path from the full URL (e.g., "0.81718738741244.jpg")
            const imagePath = avatar.imageUrl.split('/').pop()?.replace('@', ''); // Remove @ if present and get the filename
            if (imagePath) {
                console.log('Deleting image with path:', imagePath);
                const { error: storageError } = await deleteImage(imagePath, 'avatars');
                if (storageError) {
                    console.error('Error deleting image from storage:', storageError);
                    // Continue with API call even if storage deletion fails
                }
            }

            // Then delete from database
            await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/delete-avatar`, {
                avatarId: avatar.id
            });

            // Update UI state
            setAvatars(avatars.filter((avatar) => avatar.id !== avatarId));
            setAvatarToDelete(null);
            
            console.log('Avatar deleted successfully:', avatarId);
        } catch (error: unknown) {
            console.error('Error deleting avatar:', error);
            alert('Failed to delete avatar. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredAvatars = avatars.filter(
        (avatar) =>
            avatar.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-muted-foreground">Loading avatars...</div>
            </div>
        );
    }

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
            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                <div className='space-y-2'>
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
                                <Plus className="mr-0 h-4 w-4" />
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
                                    <Label htmlFor="avatar-name">Avatar Name</Label>
                                    <Input
                                        id="avatar-name"
                                        placeholder="Enter avatar name"
                                        value={avatarName}
                                        onChange={(e) => setAvatarName(e.target.value)}
                                    />
                                </div>
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
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleUpload} 
                                    disabled={!selectedFile || !avatarName.trim() || isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Upload
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Avatar grid section */}
            <div className="grid grid-cols-3 gap-32">
                {filteredAvatars.map((avatar) => (
                    <Card
                        key={avatar.id}
                        className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 p-0"
                    >
                        {/* Image section - full width */}
                        <div className="relative aspect-square w-full overflow-hidden bg-muted/50 transition-transform group-hover:scale-[1.02]">
                            <Image
                                src={avatar.imageUrl}
                                alt={avatar.name}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Content section */}
                        <div className="p-3 space-y-3">
                            <h3 className="text-base font-medium truncate text-center -mt-5">{avatar.name}</h3>
                            <div className="flex items-center justify-center gap-1">
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive/90"
                                    onClick={() => setAvatarToDelete(avatar)}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!avatarToDelete} onOpenChange={(open) => !open && setAvatarToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Avatar</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &ldquo;{avatarToDelete?.name}&rdquo;? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAvatarToDelete(null)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => avatarToDelete && handleDelete(avatarToDelete.id)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
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
