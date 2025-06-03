import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CTASection } from "@/components/landing/cta-section";
import { Navbar } from "@/components/landing/navbar";

export default function Home() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <TestimonialsSection />
            <CTASection />
        </main>
    );
}
