import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
    {
        content: "This platform has transformed how our team collaborates remotely. The virtual spaces feel natural and engaging.",
        author: "Sarah Chen",
        role: "Product Manager",
        company: "TechCorp",
        avatar: "/avatars/sarah.png",
        gradient: "from-violet-500 to-fuchsia-500"
    },
    {
        content: "We've hosted multiple virtual events using this platform. The customization options and interactive features are fantastic.",
        author: "Michael Rodriguez",
        role: "Event Coordinator",
        company: "EventPro",
        avatar: "/avatars/michael.png",
        gradient: "from-fuchsia-500 to-pink-500"
    },
    {
        content: "The ease of use and flexibility of the platform makes it perfect for both casual meetups and professional meetings.",
        author: "Emma Thompson",
        role: "Community Manager",
        company: "SocialHub",
        avatar: "/avatars/emma.png",
        gradient: "from-pink-500 to-rose-500"
    }
];

export function TestimonialsSection() {
    return (
        <section className="py-20 bg-gradient-to-b from-background/90 via-background/95 to-background flex flex-col items-center justify-center">
            <div className="container px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                        Loved by Teams Worldwide
                    </h2>
                    <p className="text-xl text-muted-foreground">
                        See what our users have to say about their experience.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6">
                    {testimonials.map((testimonial, index) => (
                        <Card key={index} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] bg-background/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                            <CardContent className="p-6">
                                <div className="flex flex-col h-full">
                                    <div className={`w-12 h-1 rounded-full bg-gradient-to-r ${testimonial.gradient} mb-6`} />
                                    <p className="text-lg mb-6 flex-grow">
                                        &quot;{testimonial.content}&quot;
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <Avatar className={`ring-2 ring-offset-2 ring-offset-background ring-${testimonial.gradient.split('-')[1]}-500`}>
                                            <AvatarImage src={testimonial.avatar} alt={testimonial.author} />
                                            <AvatarFallback className="bg-gradient-to-r from-foreground/10 to-foreground/5">
                                                {testimonial.author.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                                                {testimonial.author}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {testimonial.role} at {testimonial.company}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
} 