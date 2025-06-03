"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Map, Box, UserCircle } from "lucide-react"

const stats = [
    {
        title: "Total Users",
        value: "0",
        icon: <Users className="h-4 w-4 text-muted-foreground" />,
        description: "Active users in the platform"
    },
    {
        title: "Total Maps",
        value: "0",
        icon: <Map className="h-4 w-4 text-muted-foreground" />,
        description: "Created maps"
    },
    {
        title: "Total Elements",
        value: "0",
        icon: <Box className="h-4 w-4 text-muted-foreground" />,
        description: "Available elements"
    },
    {
        title: "Total Avatars",
        value: "0",
        icon: <UserCircle className="h-4 w-4 text-muted-foreground" />,
        description: "Available avatars"
    }
]

export default function AdminDashboard() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dashboard Overview</h1>
                <p className="text-muted-foreground">
                    Welcome to the admin dashboard. Here&apos;s an overview of your platform.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            {stat.icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            No recent activity to display.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">API Status</span>
                                <span className="text-sm text-green-500">Online</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Database</span>
                                <span className="text-sm text-green-500">Connected</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">WebSocket</span>
                                <span className="text-sm text-green-500">Connected</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
} 