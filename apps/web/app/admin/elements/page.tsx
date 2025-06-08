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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Element {
    id: string;
    name: string;
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
}

export default function ElementsPage() {
    const [elements, setElements] = useState<Element[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [elementToDelete, setElementToDelete] = useState<Element | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [elementName, setElementName] = useState('');
    const [elementWidth, setElementWidth] = useState<number>(0);
    const [elementHeight, setElementHeight] = useState<number>(0);
    const [isStatic, setIsStatic] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchElements();
    }, []);

    const fetchElements = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/elements`);
            console.log('Elements response:', response.data);
            const elementsData = response.data.elements || response.data;
            console.log('Elements data to set:', elementsData);
            setElements(elementsData);
        } catch (error) {
            console.error('Error fetching elements:', error);
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
        if (!selectedFile || !elementName.trim()) return;
        setIsUploading(true);
        try {
            // First upload the image to Supabase
            const { path, error } = await uploadImage(
                selectedFile,
                'elements',
                '', // empty path to store directly in elements bucket
            );

            if (error) {
                console.error('Error uploading element:', error);
                return;
            }

            console.log('File uploaded successfully to:', path);

            // Then store the metadata in the database
            try {
                const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/element`, {
                    imageUrl: path,
                    name: elementName.trim(),
                    width: elementWidth,
                    height: elementHeight,
                    isStatic: isStatic,
                });

                // Add new element to the list with the database ID
                const newElement: Element = {
                    id: response.data.id,
                    name: elementName.trim(),
                    imageUrl: path,
                    width: elementWidth,
                    height: elementHeight,
                    static: isStatic,
                };

                setElements([...elements, newElement]);
                setSelectedFile(null);
                setElementName('');
                setElementWidth(0);
                setElementHeight(0);
                setIsStatic(false);
                setIsUploadDialogOpen(false);
            } catch (apiError) {
                console.error('Error saving element metadata:', apiError);
            }
        } catch (error) {
            console.error('Error uploading element:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (elementId: string) => {
        try {
            setIsDeleting(true);
            // Find the element to delete
            const element = elements.find(e => e.id === elementId);
            if (!element) {
                console.error('Element not found');
                return;
            }

            // First delete from storage
            // Extract the file path from the full URL (e.g., "0.81718738741244.jpg")
            const imagePath = element.imageUrl.split('/').pop()?.replace('@', ''); // Remove @ if present and get the filename
            if (imagePath) {
                console.log('Deleting image with path:', imagePath);
                const { error: storageError } = await deleteImage(imagePath, 'elements');
                if (storageError) {
                    console.error('Error deleting image from storage:', storageError);
                    // Continue with API call even if storage deletion fails
                }
            }

            // Then delete from database
            await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/delete-element`, {
                elementId: element.id
            });

            // Update UI state
            setElements(elements.filter((element) => element.id !== elementId));
            setElementToDelete(null);
            
            console.log('Element deleted successfully:', elementId);
        } catch (error: unknown) {
            console.error('Error deleting element:', error);
            alert('Failed to delete element. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredElements = elements.filter(
        (element) => {
            console.log('Filtering element:', element);
            // Get name from element or extract from imageUrl
            const elementName = element?.name || element?.imageUrl?.split('/').pop()?.split('.')[0] || '';
            const matches = elementName.toLowerCase().includes(searchQuery.toLowerCase());
            console.log('Search query:', searchQuery, 'Element name:', elementName, 'Matches:', matches);
            return matches;
        }
    );

    console.log('Filtered elements:', filteredElements);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-muted-foreground">Loading elements...</div>
            </div>
        );
    }

    return (
        <div className="space-y-20">
            {/* Header section with title and description */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                <div className='space-y-2'>
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
                                <Plus className="mr-0 h-4 w-4" />
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
                                    <Label htmlFor="element-name">Element Name</Label>
                                    <Input
                                        id="element-name"
                                        placeholder="Enter element name"
                                        value={elementName}
                                        onChange={(e) => setElementName(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="element-width">Width(in cells)</Label>
                                        <Input
                                            id="element-width"
                                            type="number"
                                            min={1}
                                            placeholder="Width"
                                            value={elementWidth}
                                            onChange={(e) => setElementWidth(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="element-height">Height(in cells)</Label>
                                        <Input
                                            id="element-height"
                                            type="number"
                                            min={1}
                                            placeholder="Height"
                                            value={elementHeight}
                                            onChange={(e) => setElementHeight(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="element-static">Static</Label>
                                        <Select
                                            value={isStatic ? "true" : "false"}
                                            onValueChange={(value) => setIsStatic(value === "true")}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select static" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">True</SelectItem>
                                                <SelectItem value="false">False</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
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
                                    disabled={!selectedFile || !elementName.trim() || isUploading}
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

            {/* Element grid section */}
            <div className="grid grid-cols-3 gap-32 ">
                {filteredElements.map((element) => (
                    <Card
                        key={element.id}
                        className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 p-0 w-[300px]"
                    >
                        {/* Image section - full width */}
                        <div className="relative aspect-square w-full overflow-hidden bg-muted/50 transition-transform group-hover:scale-[1.02]">
                            <Image
                                src={element.imageUrl}
                                alt='map-element'
                                fill
                                className="object-contain p-4 transition-transform group-hover:scale-105"
                                sizes="300px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Content section */}
                        <div className="p-3 space-y-3">
                            <h3 className="text-base font-medium truncate text-center -mt-5">{element.name}</h3>
                            <div className="flex items-center justify-center gap-1">
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive/90"
                                    onClick={() => setElementToDelete(element)}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!elementToDelete} onOpenChange={(open) => !open && setElementToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Element</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &ldquo;{elementToDelete?.name}&rdquo;? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setElementToDelete(null)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => elementToDelete && handleDelete(elementToDelete.id)}
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

            {filteredElements.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No elements found</p>
                </div>
            )}
        </div>
    );
}
