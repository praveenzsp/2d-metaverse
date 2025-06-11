"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import axios from "@/lib/axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface Space {
    id: string
    name: string
    dimensions: string
    elements: Array<{
        id: string
        element: {
            id: string
            image: string
            width: number
            height: number
            static: boolean
        }
        x: number
        y: number
    }>
}

export default function SpacePage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const spaceId = searchParams.get("spaceId")
    const [space, setSpace] = useState<Space | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!spaceId) {
            router.push("/user/dashboard")
            return
        }

        const fetchSpace = async () => {
            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/space/${spaceId}`)
                setSpace(response.data)
            } catch (error) {
                console.error("Error fetching space:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSpace()
    }, [spaceId, router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-6 py-8">
                    <div className="text-center">
                        <p className="text-muted-foreground">Loading space...</p>
                    </div>
                </main>
            </div>
        )
    }

    if (!space) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-6 py-8">
                    <div className="text-center">
                        <p className="text-muted-foreground">Space not found</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => router.push("/user/dashboard")}
                        >
                            Return to Dashboard
                        </Button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-6 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/user/dashboard")}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">{space.name}</h1>
                        <p className="text-muted-foreground mt-2">Dimensions: {space.dimensions}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Space Elements</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {space.elements.map((element) => (
                                <Card key={element.id} className="p-4">
                                    <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                                        <Image
                                            src={element.element.image}
                                            alt={`Element at position (${element.x}, ${element.y})`}
                                            className="w-full h-full object-cover"
                                            width={element.element.width}
                                            height={element.element.height}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            Position: ({element.x}, {element.y})
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Size: {element.element.width}x{element.element.height}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Type: {element.element.static ? "Static" : "Dynamic"}
                                        </p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
} 