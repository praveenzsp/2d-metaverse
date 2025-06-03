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
import { Search, Upload, Trash2, Plus, Ruler } from 'lucide-react';
// import axios from '@/lib/axios'; // Commented out for now

interface Element {
    id: string;
    name: string;
    imageUrl: string;
    dimensions: {
        width: number;
        height: number;
    };
    createdAt: string;
}

// Dummy data for now
const dummyElements: Element[] = [
    {
        id: '1',
        name: 'Tree Element',
        imageUrl: '/elements/tree.png',
        dimensions: {
            width: 64,
            height: 96,
        },
        createdAt: '2024-03-15T10:00:00Z',
    },
    {
        id: '2',
        name: 'Rock Formation',
        imageUrl: '/elements/rock.png',
        dimensions: {
            width: 48,
            height: 48,
        },
        createdAt: '2024-03-15T11:00:00Z',
    },
    {
        id: '3',
        name: 'Water Tile',
        imageUrl: '/elements/water.png',
        dimensions: {
            width: 32,
            height: 32,
        },
        createdAt: '2024-03-15T12:00:00Z',
    },
    {
        id: '4',
        name: 'Building Block',
        imageUrl: '/elements/building.png',
        dimensions: {
            width: 96,
            height: 128,
        },
        createdAt: '2024-03-15T13:00:00Z',
    },
];

export default function ElementsPage() {
    const [elements, setElements] = useState<Element[]>(dummyElements);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [elementToDelete, setElementToDelete] = useState<Element | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            // Here you would typically get image dimensions
            // For now, we'll use dummy dimensions
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
                    // Add new element to the list
                    const newElement: Element = {
                        id: Date.now().toString(),
                        name: selectedFile.name.split('.')[0],
                        imageUrl: URL.createObjectURL(selectedFile),
                        dimensions: {
                            width: 64, // Dummy dimensions
                            height: 64,
                        },
                        createdAt: new Date().toISOString(),
                    };
                    setElements([...elements, newElement]);
                    setSelectedFile(null);
                    return 100;
                }
                return prev + 10;
            });
        }, 200);
    };

    const handleDelete = async (elementId: string) => {
        // Update local state for now
        setElements(elements.filter((element) => element.id !== elementId));
        setElementToDelete(null);
    };

    const filteredElements = elements.filter(
        (element) =>
            element.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <div className="space-y-6">
            {/* Header section with title and description */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Element Management</h1>
                    <p className="text-muted-foreground">Manage and upload custom elements for your platform</p>
                </div>
                {/* Search and Upload section */}
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search elements..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Upload Element
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload New Element</DialogTitle>
                                <DialogDescription>
                                    Upload a new element image. Supported formats: PNG, JPG, SVG (max 2MB)
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="element">Element Image</Label>
                                    <Input
                                        id="element"
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
                                                className="object-contain"
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

            {/* Elements flex container */}
            <div className="flex flex-wrap gap-6">
                {filteredElements.map((element) => (
                    <Card
                        key={element.id}
                        className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 flex-[1_1_300px] max-w-[calc(25%-18px)]"
                    >
                        <CardHeader className="!p-3 !pb-1">
                            <CardTitle className="text-lg font-medium truncate">{element.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="!p-3 !pt-1">
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted/50 transition-transform group-hover:scale-[1.02]">
                                <Image
                                    src='/nft.png'
                                    alt={element.name}
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
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Ruler className="h-3 w-3" />
                                        <span>
                                            {element.dimensions.width} × {element.dimensions.height}px
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        Added {new Date(element.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                                        onClick={() => setElementToDelete(element)}
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
            <Dialog open={!!elementToDelete} onOpenChange={(open) => !open && setElementToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Element</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &ldquo;{elementToDelete?.name}&rdquo;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setElementToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => elementToDelete && handleDelete(elementToDelete.id)}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {filteredElements.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No elements found</p>
                </div>
            )}
        </div>
    );
}
