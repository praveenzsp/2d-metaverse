'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import axios from '@/lib/axios';

interface MapElement {
    id: string;
    name: string;
    imageUrl: string;
    type: string;
        width: number;
        height: number;
    static: boolean;
}

interface MapEditSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onElementDragStart?: (element: MapElement) => void;
    onDeleteSelected?: () => void;
}


const MapEditSidebar: React.FC<MapEditSidebarProps> = ({
    isOpen,
    onClose,
    onSave,
    onElementDragStart,
    onDeleteSelected,
}) => {
	const [searchQuery, setSearchQuery] = useState('');
    const [elements, setElements] = useState<MapElement[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
    const fetchElements = async () => {
        try {
                setIsLoading(true);
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/elements`);
            // console.log('Elements response:', response.data);
            const elementsData = response.data.elements || response.data;
            // console.log('Elements data to set:', elementsData);
            setElements(elementsData);
        } catch (error) {
            console.error('Error fetching elements:', error);
        } finally {
            setIsLoading(false);
        }
        };

        fetchElements();
    }, []);

    if (!isOpen) return null;

    const handleDragStart = (e: React.DragEvent, element: MapElement) => {
        e.dataTransfer.setData('application/json', JSON.stringify(element));
        onElementDragStart?.(element);
    };

    return (
        <div className="fixed top-0 right-0 h-full w-90 bg-gray-900 text-white shadow-lg flex flex-col z-30 transition-transform duration-300 transform translate-x-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold">Drag and Drop Elements</h2>
                <Button
                    onClick={onClose}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-gray-800"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Search/Filter */}
                <div className="p-4 border-b border-gray-800">
                    <input
                        type="text"
                        placeholder="Search elements..."
                        className="w-full px-3 py-2 bg-gray-800 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Elements Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400">Loading elements...</p>
                        </div>
                    ) : (
                    <div className="grid grid-cols-2 gap-4">
                            {elements.filter((element) => 
                                element.name.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map((element) => (
                            <div
                                key={element.id}
                                className="bg-gray-800 rounded-lg p-3 cursor-move hover:bg-gray-700 transition-colors"
                                draggable
                                onDragStart={(e) => handleDragStart(e, element)}
                            >
                                <div className="relative aspect-square mb-2">
                                    <Image
                                        src={element.imageUrl}
                                        alt={element.name}
                                        fill
                                        className="object-contain rounded-md"
                                    />
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium">{element.name}</p>
                                    <p className="text-gray-400 text-xs">
                                            {element.width}x{element.height}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 space-y-2">
                <Button 
                    onClick={onDeleteSelected}
                    className="w-full bg-red-600 hover:bg-red-700"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                </Button>
                <Button 
                    onClick={onSave}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </Button>
            </div>
        </div>
    );
};

export default MapEditSidebar;
