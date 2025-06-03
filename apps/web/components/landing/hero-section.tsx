import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Gradient Grid Background */}
            <div className="absolute inset-0 z-0">
                {/* Base gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/20 via-background to-background" />
                
                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808040_1px,transparent_1px),linear-gradient(to_bottom,#80808040_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)] [box-shadow:0_0_50px_rgba(128,128,128,0.1)]" />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background" />
                
                {/* Animated gradient orbs */}
                <div className="absolute top-0 -left-4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                <div className="absolute top-0 -right-4 w-96 h-96 bg-fuchsia-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
            </div>

            <div className="container relative z-10 px-4 py-20 flex flex-col items-center text-center">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                        Your 2D Virtual Space for{" "}
                        <span className="text-primary">Meaningful Connections</span>
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Create custom virtual spaces, host events, and connect with others in a unique 2D metaverse experience.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600" asChild>
                            <Link href="/signup">Get Started</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="border-violet-500/50 hover:bg-violet-500/10" asChild>
                            <Link href="#features">Learn More</Link>
                        </Button>
                    </div>
                </div>

                {/* Preview Card with enhanced styling */}
                <Card className="mt-16 p-2 bg-background/50 backdrop-blur-sm border-violet-500/20 shadow-lg shadow-violet-500/10">
                    <div className="relative w-full max-w-4xl aspect-video rounded-lg overflow-hidden">
                        <Image
                            src="/landing-preview.png"
                            alt="Platform Preview"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </Card>

                {/* Stats with enhanced styling */}
                <div className="mt-16 flex flex-wrap justify-center gap-8 text-center">
                    <div className="space-y-2 p-4 rounded-lg bg-violet-500/10 backdrop-blur-sm">
                        <div className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">10K+</div>
                        <div className="text-muted-foreground">Active Users</div>
                    </div>
                    <div className="space-y-2 p-4 rounded-lg bg-fuchsia-500/10 backdrop-blur-sm">
                        <div className="text-3xl font-bold bg-gradient-to-r from-fuchsia-500 to-pink-500 bg-clip-text text-transparent">5K+</div>
                        <div className="text-muted-foreground">Virtual Spaces</div>
                    </div>
                    <div className="space-y-2 p-4 rounded-lg bg-pink-500/10 backdrop-blur-sm">
                        <div className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">24/7</div>
                        <div className="text-muted-foreground">Support</div>
                    </div>
                </div>
            </div>
        </section>
    );
} 