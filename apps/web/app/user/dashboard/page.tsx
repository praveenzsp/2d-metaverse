"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import axios from "@/lib/axios"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { PlusCircle, Clock, Star, Search } from "lucide-react"
import { CreateSpaceDialog } from "@/components/CreateSpaceDialog"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useUser } from "@/hooks/useUser"

interface Space {
    id: string
    name: string
    dimensions: string
    thumbnail: string
    creator: {
        id: string
        name: string
    }
}

export default function DashboardPage() {
    const router = useRouter()
    const { user } = useUser()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [userSpaces, setUserSpaces] = useState<Space[]>([])
    const [allSpaces, setAllSpaces] = useState<Space[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [spaceToDelete, setSpaceToDelete] = useState<string | null>(null)

    const fetchUserSpaces = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/all`)
            setUserSpaces(response.data.spaces)
        } catch (error) {
            console.error("Error fetching user spaces:", error)
        }
    }

    const fetchAllSpaces = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/all-spaces`)
            setAllSpaces(response.data.spaces)
        } catch (error) {
            console.error("Error fetching all spaces:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchUserSpaces()
        fetchAllSpaces()
    }, [])

    const filteredUserSpaces = userSpaces.filter(space => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredAllSpaces = allSpaces.filter(space => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDeleteClick = (spaceId: string) => {
        setSpaceToDelete(spaceId)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!spaceToDelete) return

        try {
            const response = await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/${spaceToDelete}`)
            if (response.status === 200) {
                // Refresh the spaces list after deletion
                fetchUserSpaces()
                fetchAllSpaces()
                // Close the dialog
                setDeleteDialogOpen(false)
                setSpaceToDelete(null)
            }
        } catch (error) {
            console.error("Error deleting space:", error)
            // Show error in dialog
            setDeleteDialogOpen(false)
            setSpaceToDelete(null)
        }
    }

    return (
        <ProtectedRoute requiredRole="User">
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-6 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">My Spaces</h1>
                            <p className="text-muted-foreground mt-2">Manage and explore your virtual spaces</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search spaces..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Button size="lg" className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                                <PlusCircle className="h-5 w-5" />
                                Create New Space
                            </Button>
                        </div>
                    </div>

                    <Tabs defaultValue="recent" className="w-full text-center">
                        <TabsList className="w-full max-w-md">
                            <TabsTrigger value="recent" className="flex-1 gap-2">
                                <Clock className="h-4 w-4" />
                                Recent
                            </TabsTrigger>
                            <TabsTrigger value="created" className="flex-1 gap-2">
                                <Star className="h-4 w-4" />
                                Created
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="recent" className="mt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoading ? (
                                    <div className="col-span-full text-center py-12">
                                        <p className="text-muted-foreground">Loading spaces...</p>
                                    </div>
                                ) : filteredAllSpaces.length > 0 ? (
                                    filteredAllSpaces.map((space) => (
                                        <Card
                                            key={space.id}
                                            className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 p-0"
                                        >
                                            {/* Image section - full width */}
                                            <div
                                                className="relative aspect-[16/9] w-full overflow-hidden bg-muted/50 transition-transform group-hover:scale-[1.02] cursor-pointer"
                                                onClick={() => router.push(`/user/join-preview?spaceId=${space.id}`)}
                                            >
                                                <Image
                                                    src={space.thumbnail || '/map.jpg'}
                                                    alt={space.name}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            {/* Content section */}
                                            <div className="p-3 space-y-1">
                                                <h3
                                                    className="text-base font-medium truncate cursor-pointer hover:text-primary text-left"
                                                    onClick={() =>
                                                        router.push(`/user/join-preview?spaceId=${space.id}`)
                                                    }
                                                >
                                                    {space.name}
                                                </h3>
                                                <div className="flex flex-col !gap-0.5 text-xs text-muted-foreground text-left">
                                                    <span>Dimensions: {space.dimensions}</span>
                                                    <span>Created by: {space.creator.name}</span>
                                                </div>
                                                                                                 <div className="flex items-center justify-end gap-1 pt-1">
                                                     <Button
                                                         variant="outline"
                                                         className="text-muted-foreground hover:text-primary"
                                                         onClick={() =>
                                                             router.push(`/user/join-preview?spaceId=${space.id}`)
                                                         }
                                                     >
                                                         Enter Space
                                                     </Button>
                                                     {space.creator.id === user?.userId && (
                                                         <Button
                                                             variant="outline"
                                                             className="text-destructive hover:text-destructive/90"
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleDeleteClick(space.id);
                                                             }}
                                                         >
                                                             Delete
                                                         </Button>
                                                     )}
                                                 </div>
                                            </div>
                                        </Card>
                                    ))
                                ) : (
                                                                                 <Card className="col-span-full border-dashed">
                                                 <CardContent className="flex flex-col items-center justify-center py-12">
                                                     <p className="text-muted-foreground text-center">
                                                         {searchQuery
                                                             ? "No spaces found matching your search"
                                                             : "No spaces available"}
                                                     </p>
                                                 </CardContent>
                                             </Card>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="created" className="mt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoading ? (
                                    <div className="col-span-full text-center py-12">
                                        <p className="text-muted-foreground">Loading spaces...</p>
                                    </div>
                                ) : filteredUserSpaces.length > 0 ? (
                                    filteredUserSpaces.map((space) => (
                                        <Card
                                            key={space.id}
                                            className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 p-0"
                                        >
                                            {/* Image section - full width */}
                                            <div
                                                className="relative aspect-[16/9] w-full overflow-hidden bg-muted/50 transition-transform group-hover:scale-[1.02] cursor-pointer"
                                                onClick={() => router.push(`/user/join-preview?spaceId=${space.id}`)}
                                            >
                                                <Image
                                                    src={space.thumbnail || '/map.jpg'}
                                                    alt={space.name}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            {/* Content section */}
                                            <div className="p-3 space-y-1">
                                                <h3
                                                    className="text-base font-medium truncate cursor-pointer hover:text-primary text-left"
                                                    onClick={() =>
                                                        router.push(`/user/join-preview?spaceId=${space.id}`)
                                                    }
                                                >
                                                    {space.name}
                                                </h3>
                                                <div className="flex flex-col !gap-0.5 text-xs text-muted-foreground text-left">
                                                    <span>Dimensions: {space.dimensions}</span>
                                                </div>
                                                <div className="flex items-center justify-end gap-1 pt-1">
                                                    <Button
                                                        variant="outline"
                                                        className="text-muted-foreground hover:text-primary"
                                                        onClick={() =>
                                                            router.push(`/user/join-preview?spaceId=${space.id}`)
                                                        }
                                                    >
                                                        Enter Space
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="text-destructive hover:text-destructive/90"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(space.id);
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                ) : (
                                    <Card className="col-span-full border-dashed">
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <p className="text-muted-foreground text-center">
                                                {searchQuery
                                                    ? "No spaces found matching your search"
                                                    : "You haven't created any spaces yet"}
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="mt-4"
                                                onClick={() => setIsCreateDialogOpen(true)}
                                            >
                                                Create Your First Space
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </main>

                <CreateSpaceDialog
                    isOpen={isCreateDialogOpen}
                    onClose={() => setIsCreateDialogOpen(false)}
                    onSpaceCreated={fetchUserSpaces}
                />

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Space</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this space? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteConfirm}>
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ProtectedRoute>
    )
}
