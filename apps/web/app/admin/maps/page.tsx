'use client';

import { useState, useEffect } from 'react';
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
import { Search, Upload, Plus, Pencil, Loader2 } from 'lucide-react';
import axios from '@/lib/axios';
import { uploadImage } from '@/utils/storage';

interface Map {
    id: string;
    name: string;
    width: number;
    height: number;
    thumbnail: string | null;
    dimensions: string;
}

export default function MapsPage() {
    const router = useRouter();
    const [maps, setMaps] = useState<Map[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedMap, setSelectedMap] = useState<Map | null>(null);
    const [mapToDelete, setMapToDelete] = useState<Map | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [mapName, setMapName] = useState('');
    const [mapWidth, setMapWidth] = useState('150');
    const [mapHeight, setMapHeight] = useState('100');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchMaps = async () => {
            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/maps`);
                setMaps(response.data.maps);
                console.log(response.data.maps);
            } catch (error) {
                console.error('Error fetching maps:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMaps();
    }, []);

    // Filtered maps
    const filteredMaps = maps.filter((map) => map.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Handlers
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleCreateMap = async () => {
        if (!mapName || !mapWidth || !mapHeight) return;
        setIsUploading(true);
        
        try {
            let imageUrl = null;
            
            // If a file is selected, upload it to Supabase first
            if (selectedFile) {
                const { path, error } = await uploadImage(
                    selectedFile,
                    'maps',
                    '', // empty path to store directly in maps bucket
                );

                if (error) {
                    console.error('Error uploading map thumbnail:', error);
                    return;
                }

                imageUrl = path;
                console.log('Thumbnail uploaded successfully to:', path);
            }

            // Create the map with the image URL
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/create-map`,
                {
                    name: mapName,
                    dimensions: `${mapWidth}x${mapHeight}`,
                    thumbnail: imageUrl,
                    defaultElements: []
                }
            );

            if (response.data.id) {
                // Refresh the maps list
                const mapsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/maps`);
                setMaps(mapsResponse.data.maps);
                
                // Reset form
                    setIsCreateDialogOpen(false);
                setMapName('');
                setMapWidth('150');
                setMapHeight('100');
                    setSelectedFile(null);
            }
        } catch (error) {
            console.error('Error creating map:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditMap = async () => {
        if (!selectedMap || !mapName) return;
        setIsUploading(true);
        
        try {
            let imageUrl = selectedMap.thumbnail;
            
            // If a new file is selected, upload it to Supabase first
            if (selectedFile) {
                const { path, error } = await uploadImage(
                    selectedFile,
                    'maps',
                    '', // empty path to store directly in maps bucket
                );

                if (error) {
                    console.error('Error uploading map thumbnail:', error);
                    return;
                }

                imageUrl = path;
                console.log('Thumbnail uploaded successfully to:', path);
            }

            // Update the map with the new details
            const response = await axios.put(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/update-map`,
                {
                    mapId: selectedMap.id,
                    name: mapName,
                    thumbnail: imageUrl
                }
            );

            if (response.data.map) {
                // Update the maps list with the updated map
                setMaps(maps.map((map) =>
                    map.id === selectedMap.id ? response.data.map : map
                ));
                
                // Reset form and close dialog
        setIsEditDialogOpen(false);
        setSelectedMap(null);
                setMapName('');
        setSelectedFile(null);
            }
        } catch (error) {
            console.error('Error updating map:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (mapId: string) => {
        try {
            setIsDeleting(true);
            await axios.delete(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/delete-map`,
                {
                    data: { mapId }
                }
            );
            
            // Update UI state
        setMaps(maps.filter((map) => map.id !== mapId));
        setMapToDelete(null);
        } catch (error) {
            console.error('Error deleting map:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Open edit dialog and prefill form
    const openEditDialog = (map: Map) => {
        setSelectedMap(map);
        setMapName(map.name);
        setSelectedFile(null);
        setIsEditDialogOpen(true);
    };

    const handleMapClick = (mapId: string) => {
        router.push(`/admin/maps/${mapId}/arena`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
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
                {isLoading ? (
                    <div className="col-span-3 text-center py-12">
                        <p className="text-muted-foreground">Loading maps...</p>
                    </div>
                ) : filteredMaps.length === 0 ? (
                    <div className="col-span-3 text-center py-12">
                        <p className="text-muted-foreground">No maps found</p>
                    </div>
                ) : (
                    filteredMaps.map((map) => (
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
                                    src={map.thumbnail || "/map.jpg"}
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
                                    <span>Dimensions: {map.dimensions}</span>
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
                    ))
                )}
            </div>

            {/* Create Map Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Map</DialogTitle>
                        <DialogDescription>
                            Add a new map to your platform. Enter the name, dimensions, and upload a thumbnail.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="map-name">Map Name</Label>
                            <Input
                                id="map-name"
                                value={mapName}
                                onChange={(e) => setMapName(e.target.value)}
                                placeholder="Enter map name"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="map-width">Width(in cells)</Label>
                                <Input
                                    id="map-width"
                                    type="number"
                                    value={mapWidth}
                                    onChange={(e) => setMapWidth(e.target.value)}
                                    placeholder="Enter width"
                                    min="70"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="map-height">Height(in cells)</Label>
                                <Input
                                    id="map-height"
                                    type="number"
                                    value={mapHeight}
                                    onChange={(e) => setMapHeight(e.target.value)}
                                    placeholder="Enter height"
                                    min="50"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="map-thumbnail">Thumbnail</Label>
                            <Input
                                id="map-thumbnail"
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
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateMap} 
                            disabled={!mapName || !mapWidth || !mapHeight || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                            <Upload className="mr-2 h-4 w-4" />
                            Create
                                </>
                            )}
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
                                value={mapName}
                                onChange={(e) => setMapName(e.target.value)}
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
                                                : selectedMap?.thumbnail || ''
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
                        <Button onClick={handleEditMap} disabled={!mapName}>
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
                        <Button 
                            variant="destructive" 
                            onClick={() => mapToDelete && handleDelete(mapToDelete.id)}
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
        </div>
    );
}
