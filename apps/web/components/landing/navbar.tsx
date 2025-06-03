"use client"
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40">
            <div className="container px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="text-xl font-bold">
                        Metaverse
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </Link>
                        <Link href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                            Testimonials
                        </Link>
                        <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                            Pricing
                        </Link>
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <Button variant="outline" asChild>
                                <Link href="/signin">Logout</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/signup">Get Started</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center gap-4 md:hidden">
                        <ThemeToggle />
                        <button
                            className="p-2"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 space-y-4">
                        <Link
                            href="#features"
                            className="block text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Features
                        </Link>
                        <Link
                            href="#testimonials"
                            className="block text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Testimonials
                        </Link>
                        <Link
                            href="/pricing"
                            className="block text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Pricing
                        </Link>
                        <div className="flex flex-col gap-2 pt-4">
                            <Button variant="ghost" asChild className="w-full">
                                <Link href="/signin">Sign In</Link>
                            </Button>
                            <Button asChild className="w-full">
                                <Link href="/signup">Get Started</Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
} 