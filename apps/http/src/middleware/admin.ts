import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { JWT_SECRET } from "../config";


export const adminMiddleware=(req: Request, res: Response, next: NextFunction)=>{
	const header=req.headers.authorization;

	if(!header){
		res.status(401).json({message: "Unauthorized"});
		return;
	}

	const token=header.split(" ")[1];

	if(!token){
		res.status(403).json({message: "Unauthorized"});
		return;
	}

	try{
		const decoded = jwt.verify(token, JWT_SECRET) as {userId: string, role: string};
		
		// Extend Request type to include userId
		req.userId = decoded.userId;
		
		// Verify admin role
		if (decoded.role !== 'Admin') {
			res.status(403).json({ message: "Forbidden - Admin access required" });
			return;
		}
		
		next();
	} catch (error) {
		res.status(401).json({ message: "Unauthorised" });
		return;
	}

}