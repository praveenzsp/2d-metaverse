"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import axios from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");
		
		try {
			const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/signin`, {
				email: email,
				password: password,
			});

			if (response.status === 200) {
				// Redirect based on user role
				if (response.data.role === "Admin") {
					// @TODO: Redirect to admin dashboard
					router.push("/admin/dashboard");
				} else {
					// @TODO: Redirect to user dashboard
					router.push("/user/dashboard");
				}
			}
		} catch (error) {
			console.error(error)
			setError("An error occurred during sign in");
		}
	};

	return (
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
							Sign In
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
	);
}
