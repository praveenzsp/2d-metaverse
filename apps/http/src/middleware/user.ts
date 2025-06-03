import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { JWT_SECRET } from "../config";

export const userAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
	// Get the auth token from cookies
	const token = req.cookies.auth_token;

	if (!token) {
		res.status(401).json({ message: "Unauthorized - No authentication token found" });
		return;
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string };
		
		// Extend Request type to include userId
		req.userId = decoded.userId;
		
		// Note: We don't check for User role here since admin can access user routes
		next();
	} catch (error) {
		res.status(401).json({ message: "Unauthorized - Invalid token" });
		return;
	}
}