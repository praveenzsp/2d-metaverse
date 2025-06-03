import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Users, 
    Layout, 
    MessageSquare, 
    Sparkles, 
    Shield, 
    Zap 
} from "lucide-react";

const features = [
    {
        icon: <Users className="w-6 h-6" />,
        title: "Virtual Spaces",
        description: "Create and customize your own virtual spaces for meetings, events, or social gatherings.",
        gradient: "from-violet-500 to-fuchsia-500"
    },
    {
        icon: <Layout className="w-6 h-6" />,
        title: "Custom Avatars",
        description: "Express yourself with unique avatars and customize your virtual presence.",
        gradient: "from-fuchsia-500 to-pink-500"
    },
    {
        icon: <MessageSquare className="w-6 h-6" />,
        title: "Real-time Chat",
        description: "Communicate seamlessly with text and voice chat in your virtual spaces.",
        gradient: "from-pink-500 to-rose-500"
    },
    {
        icon: <Sparkles className="w-6 h-6" />,
        title: "Interactive Elements",
        description: "Add interactive elements and games to make your spaces more engaging.",
        gradient: "from-rose-500 to-orange-500"
    },
    {
        icon: <Shield className="w-6 h-6" />,
        title: "Privacy Controls",
        description: "Full control over who can join your spaces and how they interact.",
        gradient: "from-orange-500 to-amber-500"
    },
    {
        icon: <Zap className="w-6 h-6" />,
        title: "Easy Integration",
        description: "Seamlessly integrate with your existing tools and workflows.",
        gradient: "from-amber-500 to-yellow-500"
    }
];

export function FeaturesSection() {
    return (
        <section id="features" className="py-20 bg-gradient-to-b from-background via-background/95 to-background/90 flex flex-col items-center justify-center">
            <div className="container px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                        Everything You Need for Virtual Collaboration
                    </h2>
                    <p className="text-xl text-muted-foreground">
                        Powerful features to create engaging virtual spaces and meaningful connections.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6">
                    {features.map((feature, index) => (
                        <Card key={index} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-background/50 backdrop-blur-sm">
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.gradient} flex items-center justify-center text-white mb-4`}>
                                    {feature.icon}
                                </div>
                                <CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                                    {feature.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base">
                                    {feature.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
} 