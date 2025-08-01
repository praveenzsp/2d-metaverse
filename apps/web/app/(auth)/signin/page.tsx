"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PublicRoute } from "@/components/PublicRoute";

export default function SignInPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { login } = useAuth();

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);
		
		const result = await login(email, password);
		
		if (!result.success) {
			setError(result.error || "An error occurred during sign in");
		}
		
		setIsLoading(false);
	};

	return (
		<PublicRoute>
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-[350px]">
					<CardHeader>
						<CardTitle>Sign In</CardTitle>
						<CardDescription>Enter your credentials to access your account</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<div className="p-2 text-sm text-red-500 bg-red-50 rounded-md">
									{error}
								</div>
							)}
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={isLoading}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										disabled={isLoading}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
										onClick={() => setShowPassword(!showPassword)}
										disabled={isLoading}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4 text-gray-500" />
										) : (
											<Eye className="h-4 w-4 text-gray-500" />
										)}
									</Button>
								</div>
							</div>
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? "Signing In..." : "Sign In"}
							</Button>
						</form>
					</CardContent>
					<CardFooter className="flex justify-center">
						<p className="text-sm text-muted-foreground">
							Don&apos;t have an account?{" "}
							<Link href="/signup" className="text-primary hover:underline">
								Sign up
							</Link>
						</p>
					</CardFooter>
				</Card>
			</div>
		</PublicRoute>
	);
}
