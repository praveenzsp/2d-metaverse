'use client';
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface MapElement {
    id: string;
    name: string;
    imageUrl: string;
    type: 'tree' | 'rock' | 'chest' | 'house' | 'fence' | 'bush' | 'flower' | 'path' | 'work_desk';
    size: {
        width: number;
        height: number;
    };
}

interface MapEditSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onElementDragStart?: (element: MapElement) => void;
}

// Dummy data for map elements
const mapElements: MapElement[] = [
    {
        id: '1',
        name: 'Work Desk',
        imageUrl: '/elements/work_desk.png',
        type: 'work_desk',
        size: { width: 1, height: 1 }
    },
    {
        id: '2',
        name: 'Work Desk (Large)',
        imageUrl: '/elements/work_desk.png',
        type: 'work_desk',
        size: { width: 2, height: 2 }
    },
    {
        id: '3',
        name: 'Work Desk (XL)',
        imageUrl: '/elements/work_desk.png',
        type: 'work_desk',
        size: { width: 3, height: 2 }
    },
    {
        id: '4',
        name: 'Large Rock',
        imageUrl: '/elements/work_desk.png',
        type: 'rock',
        size: { width: 2, height: 2 }
    },
    {
        id: '5',
        name: 'Small Rock',
        imageUrl: '/elements/work_desk.png',
        type: 'rock',
        size: { width: 1, height: 1 }
    },
    {
        id: '6',
        name: 'Treasure Chest',
        imageUrl: '/elements/work_desk.png',
        type: 'chest',
        size: { width: 1, height: 1 }
    },
    {
        id: '7',
        name: 'Wooden House',
        imageUrl: '/elements/work_desk.png',
        type: 'house',
        size: { width: 3, height: 2 }
    },
    {
        id: '8',
        name: 'Stone Fence',
        imageUrl: '/elements/work_desk.png',
        type: 'fence',
        size: { width: 3, height: 2 }
    },
    {
        id: '9',
        name: 'Bush',
        imageUrl: '/elements/work_desk.png',
        type: 'bush',
        size: { width: 1, height: 1 }
    },
    {
        id: '10',
        name: 'Flower Patch',
        imageUrl: '/elements/work_desk.png',
        type: 'flower',
        size: { width: 1, height: 1 }
    },
    {
        id: '11',
        name: 'Stone Path',
        imageUrl: '/elements/work_desk.png',
        type: 'path',
        size: { width: 1, height: 1 }
    }
];

const MapEditSidebar: React.FC<MapEditSidebarProps> = ({
    isOpen,
    onClose,
    onSave,
    onElementDragStart,
}) => {
	const [searchQuery, setSearchQuery] = useState('');
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
                    <div className="grid grid-cols-2 gap-4">
                        {mapElements.filter((element) => element.name.toLowerCase().includes(searchQuery.toLowerCase())).map((element) => (
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
                                        {element.size.width}x{element.size.height}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800">
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
