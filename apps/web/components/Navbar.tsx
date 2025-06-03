"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import axios from "@/lib/axios"

export function Navbar() {
    const router = useRouter()

    const handleSignOut = async () => {
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/signout`)
            router.push("/signin")
        } catch (error) {
            console.error("Error signing out:", error)
        }
    }

    return (
        <nav className="border-b">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center space-x-8">
                    <Link href="/dashboard" className="text-xl font-bold">
                        Metaverse
                    </Link>
                    {/* <div className="hidden md:flex space-x-6">
                        <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
                            Dashboard
                        </Link>
                        <Link href="/spaces" className="text-sm font-medium hover:text-primary">
                            Explore Spaces
                        </Link>
                        <Link href="/create" className="text-sm font-medium hover:text-primary">
                            Create Space
                        </Link>
                    </div> */}
                </div>
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={handleSignOut}>
                        Sign Out
                    </Button>
                </div>
            </div>
        </nav>
    )
} 