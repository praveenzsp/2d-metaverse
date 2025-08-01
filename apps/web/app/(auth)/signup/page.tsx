'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { PublicRoute } from '@/components/PublicRoute';

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        try {
            // First signup
            const signupResponse = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/signup`, {
                email: email,
                username: username,
                password: password,
                type: 'user', // Default to user type
            });

            if (signupResponse.status === 201) {
                // Then automatically signin
                const signinResponse = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/signin`, {
                    email: email,
                    password: password,
                });

                if (signinResponse.status === 200) {
                    // Redirect to dashboard based on role
                    if (signinResponse.data.role === 'Admin') {
                        router.push('/admin/dashboard');
                    } else {
                        router.push('/user/dashboard');
                    }
                }
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred during sign up');
        }
    };

    return (
        <PublicRoute>
            <div className="flex min-h-screen items-center justify-center">
                <Card className="w-[350px]">
                    <CardHeader>
                        <CardTitle>Create Account</CardTitle>
                        <CardDescription>Enter your details to create a new account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="p-2 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="your_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    maxLength={10}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-gray-500" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                Sign Up
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/signin" className="text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </PublicRoute>
    );
}
