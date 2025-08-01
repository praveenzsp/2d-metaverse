import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: '2D Metaverse',
    description: 'Your virtual space for meaningful connections',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning={true}>
            <body className={inter.className}>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
                    <AuthProvider>
                        {children}
                        <Toaster position="top-center" richColors duration={2000} />
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
