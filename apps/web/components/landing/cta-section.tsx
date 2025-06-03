import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export function CTASection() {
    return (
        <section className="py-20 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0">
                {/* Gradient orbs */}
                <div className="absolute top-0 -left-4 w-96 h-96 bg-violet-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                <div className="absolute top-0 -right-4 w-96 h-96 bg-fuchsia-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
            </div>

            <div className="container px-4 relative z-10">
                <Card className="relative overflow-hidden border-violet-500/20 bg-background/50 backdrop-blur-sm">
                    {/* Gradient border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 opacity-50" />
                    <div className="absolute inset-[1px] bg-background/50 backdrop-blur-sm rounded-[inherit]" />

                    <div className="relative px-6 py-16 sm:px-12 sm:py-20 flex flex-col items-center text-center">
                        {/* Decorative elements */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent" />

                        <h2 className="text-3xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                            Ready to Create Your Virtual Space?
                        </h2>
                        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                            Join thousands of users who are already building meaningful connections in their custom
                            virtual spaces.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                                size="lg"
                                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300"
                                asChild
                            >
                                <Link href="/signup">Get Started for Free</Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-violet-500/50 hover:bg-violet-500/10 hover:border-violet-500/70 transition-all duration-300"
                                asChild
                            >
                                <Link href="/contact">Contact Sales</Link>
                            </Button>
                        </div>
                        <p className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-violet-500/50 animate-pulse" />
                            No credit card required. Free plan available.
                        </p>
                    </div>
                </Card>
            </div>
        </section>
    );
}
