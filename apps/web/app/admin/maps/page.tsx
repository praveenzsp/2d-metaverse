'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Upload, Plus, Pencil } from 'lucide-react';

interface Map {
    id: string;
    name: string;
    imageUrl: string;
    createdAt: string;
    updatedAt: string;
}

const dummyMaps: Map[] = [
    {
        id: '1',
        name: 'Forest Realm',
        imageUrl: '/maps/forest.png',
        createdAt: '2024-03-10T10:00:00Z',
        updatedAt: '2024-03-12T12:00:00Z',
    },
    {
        id: '2',
        name: 'Desert Dunes',
        imageUrl: '/maps/desert.png',
        createdAt: '2024-03-11T09:00:00Z',
        updatedAt: '2024-03-13T14:00:00Z',
    },
    {
        id: '3',
        name: 'Crystal Lake',
        imageUrl: '/maps/lake.png',
        createdAt: '2024-03-12T08:00:00Z',
        updatedAt: '2024-03-14T16:00:00Z',
    },
    {
        id: '4',
        name: 'Crystal Lake',
        imageUrl: '/maps/lake.png',
        createdAt: '2024-03-12T08:00:00Z',
        updatedAt: '2024-03-14T16:00:00Z',
    },
    {
        id: '5',
        name: 'Crystal Lake',
        imageUrl: '/maps/lake.png',
        createdAt: '2024-03-12T08:00:00Z',
        updatedAt: '2024-03-14T16:00:00Z',
    },
];

export default function MapsPage() {
    const router = useRouter();
    const [maps, setMaps] = useState<Map[]>(dummyMaps);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedMap, setSelectedMap] = useState<Map | null>(null);
    const [mapToDelete, setMapToDelete] = useState<Map | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formName, setFormName] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    // Filtered maps
    const filteredMaps = maps.filter((map) => map.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Handlers
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleCreate = () => {
        if (!formName || !selectedFile) return;
        setUploadProgress(0);
        const interval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    const newMap: Map = {
                        id: Date.now().toString(),
                        name: formName,
                        imageUrl: URL.createObjectURL(selectedFile),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    setMaps([...maps, newMap]);
                    setIsCreateDialogOpen(false);
                    setFormName('');
                    setSelectedFile(null);
                    setUploadProgress(0);
                    return 100;
                }
                return prev + 10;
            });
        }, 200);
    };

    const handleEdit = () => {
        if (!selectedMap || !formName) return;
        setMaps(
            maps.map((map) =>
                map.id === selectedMap.id
                    ? {
                          ...map,
                          name: formName,
                          imageUrl: selectedFile ? URL.createObjectURL(selectedFile) : map.imageUrl,
                          updatedAt: new Date().toISOString(),
                      }
                    : map,
            ),
        );
        setIsEditDialogOpen(false);
        setSelectedMap(null);
        setFormName('');
        setSelectedFile(null);
    };

    const handleDelete = (mapId: string) => {
        setMaps(maps.filter((map) => map.id !== mapId));
        setMapToDelete(null);
    };

    // Open edit dialog and prefill form
    const openEditDialog = (map: Map) => {
        setSelectedMap(map);
        setFormName(map.name);
        setSelectedFile(null);
        setIsEditDialogOpen(true);
    };

    const handleMapClick = (mapId: string) => {
        router.push(`/admin/maps/${mapId}/arena`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Map Management</h1>
                    <p className="text-muted-foreground">Manage, create, and edit maps for your platform</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search maps..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Map
                    </Button>
                </div>
            </div>

            {/* Map cards */}
            <div className="grid grid-cols-3 gap-6">
                {filteredMaps.map((map) => (
                    <Card
                        key={map.id}
                        className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 p-0"
                    >
                        {/* Image section - full width */}
                        <div
                            className="relative aspect-[16/9] w-full overflow-hidden bg-muted/50 transition-transform group-hover:scale-[1.02] cursor-pointer"
                            onClick={() => handleMapClick(map.id)}
                        >
                            <Image
                                src="/map.jpg"
                                alt={map.name}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Content section */}
                        <div className="p-3 space-y-1">
                            <h3
                                className="text-base font-medium truncate cursor-pointer hover:text-primary"
                                onClick={() => handleMapClick(map.id)}
                            >
                                {map.name}
                            </h3>
                            <div className="flex flex-col !gap-0.5 text-xs text-muted-foreground">
                                <span>Created {new Date(map.createdAt).toLocaleDateString()}</span>
                                <span>Updated {new Date(map.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-end gap-1 pt-1">
                                <Button
                                    variant="outline"
                                    className="text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(map);
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive/90"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMapToDelete(map);
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Create Map Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Map</DialogTitle>
                        <DialogDescription>
                            Add a new map to your platform. Supported formats: PNG, JPG, SVG (max 2MB)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="map-name">Map Name</Label>
                            <Input
                                id="map-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Enter map name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="map-image">Thumbnail</Label>
                            <Input
                                id="map-image"
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
                                    <Image src="/map.jpg" alt="" fill className="object-cover" />
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
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={!formName || !selectedFile || uploadProgress > 0}>
                            <Upload className="mr-2 h-4 w-4" />
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Map Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Map</DialogTitle>
                        <DialogDescription>
                            Update the map details. You can change the name and image.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-map-name">Map Name</Label>
                            <Input
                                id="edit-map-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Enter map name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-map-image">Map Image</Label>
                            <Input
                                id="edit-map-image"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="cursor-pointer"
                            />
                        </div>
                        {(selectedFile || selectedMap) && (
                            <div className="space-y-2">
                                <Label>Preview</Label>
                                <div className="relative h-32 w-32 rounded-lg overflow-hidden border">
                                    <Image
                                        src={
                                            selectedFile
                                                ? URL.createObjectURL(selectedFile)
                                                : selectedMap?.imageUrl || ''
                                        }
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit} disabled={!formName}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!mapToDelete} onOpenChange={(open) => !open && setMapToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Map</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &ldquo;{mapToDelete?.name}&rdquo;? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMapToDelete(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => mapToDelete && handleDelete(mapToDelete.id)}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {filteredMaps.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No maps found</p>
                </div>
            )}
        </div>
    );
}
