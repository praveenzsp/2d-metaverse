"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import axios from "@/lib/axios"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/Navbar"

export default function DashboardPage() {
    const router = useRouter()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeTab, setActiveTab] = useState("recent")

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

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">My Spaces</h1>
                <Tabs defaultValue="recent" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="recent">Recently Visited</TabsTrigger>
                        <TabsTrigger value="created">Created by Me</TabsTrigger>
                    </TabsList>
                    <TabsContent value="recent" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recently Visited Spaces</CardTitle>
                                <CardDescription>Spaces you&apos;ve recently interacted with</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Content for recently visited spaces will go here */}
                                <p className="text-muted-foreground">No recently visited spaces</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="created" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Created Spaces</CardTitle>
                                <CardDescription>Spaces you&apos;ve created</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Content for created spaces will go here */}
                                <p className="text-muted-foreground">No created spaces yet</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
} 