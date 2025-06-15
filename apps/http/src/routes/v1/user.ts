import { Router, Request, Response } from "express";
import { userAuthMiddleware } from "../../middleware/user";
import { UpdateMetadataSchema } from "../../types";
import prisma from "@repo/db/client";

const userRouter=Router();

// Get current user's profile data
userRouter.get("/profile", userAuthMiddleware, async (req: Request, res: Response) => {
	try {
		const user = await prisma.user.findUnique({
			where: {
				id: req.userId
			},
			select: {
				id: true,
				username: true,
				avatar: {
					select: {
						id: true,
						imageUrl: true
					}
				}
			}
		});

		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		res.status(200).json(user);
	} catch (error) {
		console.error('Error fetching user profile:', error);
		res.status(500).json({ message: "Internal server error" });
	}
});

// Get all available avatars
userRouter.get("/avatars", userAuthMiddleware, async (req: Request, res: Response) => {
	try {
		const avatars = await prisma.avatar.findMany({
			select: {
				id: true,
				imageUrl: true,
				name: true
			}
		});

		res.status(200).json(avatars);
	} catch (error) {
		console.error('Error fetching avatars:', error);
		res.status(500).json({ message: "Internal server error" });
	}
});

userRouter.post("/metadata", userAuthMiddleware, async (req: Request, res: Response)=>{
	const parsedData = UpdateMetadataSchema.safeParse(req.body);

	if(!parsedData.success){
		res.status(400).json({message: "Invalid data"});
		return;
	}

	const {avatarId} = parsedData.data;

	try{
		await prisma.user.update({
			where: {
				id: req.userId
			},
			data: {
				avatarId
			},
		})

		res.status(200).json({message: "Metadata updated"});
		return;
	}
	catch(error){
		res.status(500).json({message: "Internal server error"});
		return;
	}
})

userRouter.get("/metadata/bulk", userAuthMiddleware, async(req: Request, res: Response)=>{
	// Parse the ids query parameter
	const idsParam = req.query.ids;
	if (!idsParam || typeof idsParam !== 'string') {
		res.status(400).json({ message: "Missing or invalid ids parameter" });
		return;
	}

	// Parse the string array into actual array
	let userIds: string[];
	try {
		userIds = JSON.parse(idsParam);
		if (!Array.isArray(userIds) || !userIds.every(id => typeof id === 'string')) {
			throw new Error('Invalid ids format');
		}
	} catch (error) {
		res.status(400).json({ message: "Invalid ids format. Expected JSON array of strings" });
		return;
	}

	try {
		const metadata = await prisma.user.findMany({
			where: {
				id: {
					in: userIds
				}
			},
			select: {
				id: true,
				avatar: {
					select: {
						imageUrl: true
					}
				}
			}
		});

		res.status(200).json({
			avatars: metadata.map((user:any) => ({
				userId: user.id,
				imageUrl: user.avatar?.imageUrl || null
			}))
		});
		return;
	}
	catch(error){
		console.error('Error fetching user metadata:', error);
		res.status(500).json({ message: "Internal server error" });
		return;
	}
})

export default userRouter;