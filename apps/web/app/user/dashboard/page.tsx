"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import axios from "@/lib/axios"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { PlusCircle, Clock, Star, Search } from "lucide-react"
import { CreateSpaceDialog } from "@/components/CreateSpaceDialog"
import Image from "next/image"
import { Input } from "@/components/ui/input"

interface Space {
    id: string
    name: string
    dimensions: string
    thumbnail: string
}

export default function DashboardPage() {
    const router = useRouter()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [spaces, setSpaces] = useState<Space[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me`)
                if (response.status !== 200) {
                    router.push("/signin")
                }
            } catch (error) {
                console.error(error)
                router.push("/signin")
            }
        }
        checkAuth()
    }, [router])

    const fetchSpaces = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/all`)
            setSpaces(response.data.spaces)
        } catch (error) {
            console.error("Error fetching spaces:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchSpaces()
    }, [])

    const filteredSpaces = spaces.filter(space => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
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

                <Tabs defaultValue="recent" className="w-full">
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
                            ) : filteredSpaces.length > 0 ? (
                                filteredSpaces.map((space) => (
                                    <Card key={space.id} className="group hover:shadow-lg transition-all duration-200">
                                        <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                                            {space.thumbnail ? (
                                                <Image
                                                    src={space.thumbnail}
                                                    alt={space.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600" />
                                            )}
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xl">{space.name}</CardTitle>
                                            <CardDescription>{space.dimensions}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => router.push(`/user/space?spaceId=${space.id}`)}
                                            >
                                                Enter Space
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card className="col-span-full border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <p className="text-muted-foreground text-center">
                                            {searchQuery ? "No spaces found matching your search" : "No spaces yet"}
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

                    <TabsContent value="created" className="mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoading ? (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-muted-foreground">Loading spaces...</p>
                                </div>
                            ) : filteredSpaces.length > 0 ? (
                                filteredSpaces.map((space) => (
                                    <Card key={space.id} className="group hover:shadow-lg transition-all duration-200">
                                        <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                                            {space.thumbnail ? (
                                                <Image
                                                    src={space.thumbnail}
                                                    alt={space.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600" />
                                            )}
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xl">{space.name}</CardTitle>
                                            <CardDescription>{space.dimensions}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => router.push(`/space/${space.id}`)}
                                            >
                                                Enter Space
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card className="col-span-full border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <p className="text-muted-foreground text-center">
                                            {searchQuery ? "No spaces found matching your search" : "You haven&apos;t created any spaces yet"}
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
                onSpaceCreated={fetchSpaces}
            />
        </div>
    )
} 