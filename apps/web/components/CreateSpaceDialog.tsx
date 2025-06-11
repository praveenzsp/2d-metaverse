"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search } from "lucide-react"
import axios from "@/lib/axios"
import Image from "next/image"

interface Map {
    id: string
    name: string
    thumbnail: string
    width: string
    height: string
}

interface CreateSpaceDialogProps {
    isOpen: boolean
    onClose: () => void
    onSpaceCreated: () => void
}

export function CreateSpaceDialog({ isOpen, onClose, onSpaceCreated }: CreateSpaceDialogProps) {
    const [maps, setMaps] = useState<Map[]>([])
    const [selectedMap, setSelectedMap] = useState<Map | null>(null)
    const [spaceName, setSpaceName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const fetchMaps = async () => {
            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/maps`)
                setMaps(response.data.maps)
            } catch (error) {
                console.error("Error fetching maps:", error)
            }
        }

        if (isOpen) {
            fetchMaps()
        }
    }, [isOpen])

    const handleCreateSpace = async () => {
        if (!selectedMap || !spaceName.trim()) return

        setIsLoading(true)
        try {
            console.log('Selected Map:', selectedMap)
            const dimensions = `${selectedMap.width}x${selectedMap.height}`
            console.log('Formatted dimensions:', dimensions)
            
            await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/create-space`, {
                name: spaceName,
                dimensions,
                mapId: selectedMap.id
            })
            
            onSpaceCreated()
            onClose()
        } catch (error) {
            console.error("Error creating space:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredMaps = maps.filter(map => 
        map.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Create New Space</DialogTitle>
                    <DialogDescription className="text-base">
                        Choose a template map to create your space
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="space-name" className="text-base">Space Name</Label>
                        <Input
                            id="space-name"
                            placeholder="Enter a name for your space"
                            value={spaceName}
                            onChange={(e) => setSpaceName(e.target.value)}
                            className="h-11 text-base"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-base">Search Maps</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search maps by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 pl-9 text-base"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto p-1">
                        {filteredMaps.map((map) => (
                            <div
                                key={map.id}
                                className={`group relative aspect-video rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                                    selectedMap?.id === map.id
                                        ? "ring-2 ring-primary ring-offset-2"
                                        : "hover:ring-2 hover:ring-primary/50 hover:ring-offset-2"
                                }`}
                                onClick={() => setSelectedMap(map)}
                            >
                                <Image
                                    src={map.thumbnail}
                                    alt={map.name}
                                    fill
                                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <h3 className="text-white font-semibold text-lg">{map.name}</h3>
                                    <p className="text-white/80 text-sm">{map.width}x{map.height}</p>
                                </div>
                                {selectedMap?.id === map.id && (
                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button variant="outline" onClick={onClose} className="h-11">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateSpace}
                            disabled={!selectedMap || !spaceName.trim() || isLoading}
                            className="h-11"
                        >
                            {isLoading ? "Creating..." : "Create Space"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
} 