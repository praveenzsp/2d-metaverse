import { Router, Request, Response } from "express";
import { userMiddleware } from "../../middleware/user";
import { UpdateMetadataSchema } from "../../types";
import prisma from "@repo/db/client";

const userRouter=Router();


userRouter.post("/metadata", userMiddleware, async (req: Request, res: Response)=>{
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

userRouter.get("/metadata/bulk", userMiddleware, async(req: Request, res: Response)=>{
	const userIds = (req.query.ids) as string[];

	try{
		const metadata = await prisma.user.findMany({
			where: {
				id: {
					in: userIds
				}
			},
			select: {
				id: true,
				avatar: true
			}
		})

		res.status(200).json({avatars: metadata.map(user => ({
			userId: user.id,
			imageUrl: user.avatar?.imageUrl
		}))});
		return;
	}
	catch(error){
		res.status(500).json({message: "Internal server error"});
		return;
	}
	
})


export default userRouter;