import { Router, Request, Response } from "express";
import { adminMiddleware } from "../../middleware/admin";
import { CreateAvatarSchema, CreateElementSchema, CreateMapSchema, UpdateElementSchema } from "../../types";
import prisma from "@repo/db/client";

const adminRouter=Router();


adminRouter.get("/element", adminMiddleware, async (req:Request, res:Response)=>{
	const parsedData = CreateElementSchema.safeParse(req.body);
	if(!parsedData.success){
		res.status(400).json({error: parsedData.error.message});
		return;
	}
	const {imageUrl, width, height, isStatic} = parsedData.data;
	try{
		const element = await prisma.element.create({
			data: {
				imageUrl,
				width,
				height,
				static: isStatic,
			}
		})
		res.status(200).json({id: element.id});
	}catch(error){
		res.status(500).json({error: "Failed to create element"});
		return;
	}
})

adminRouter.get("/element/:elementId", adminMiddleware, async (req:Request, res:Response)=>{
	const parsedData = UpdateElementSchema.safeParse(req.body);
	if(!parsedData.success){
		res.status(400).json({error: parsedData.error.message});
		return;
	}
	const {imageUrl} = parsedData.data;
	try{
		const element = await prisma.element.update({
			where: {id: req.params.elementId},
			data: {imageUrl}
		})
		res.status(200).json({id: element.id});
		return;
	}catch(error){
		res.status(500).json({error: "Failed to update element"});
		return;
	}
})

adminRouter.post("/avatar", adminMiddleware, async (req:Request, res:Response)=>{
	const parsedData = CreateAvatarSchema.safeParse(req.body);
	if(!parsedData.success){
		res.status(400).json({error: parsedData.error.message});
		return;
	}
	const {imageUrl, name} = parsedData.data;
	
	try{
		const avatar = await prisma.avatar.create({
			data: {
				imageUrl,
				name,
			}
		})
		res.status(200).json({avatarId: avatar.id});
		return;
	}catch(error){
		res.status(500).json({error: "Failed to create avatar"});
		return;
	}
})

adminRouter.post("/map", adminMiddleware, async (req:Request, res:Response)=>{
	const parsedData = CreateMapSchema.safeParse(req.body);
	if(!parsedData.success){
		res.status(400).json({error: parsedData.error.message});
		return;
	}
	const {thumbnail, dimensions, defaultElements, name} = parsedData.data;

	try{
		const map =await prisma.map.create({
			data: {
				name,
				thumbnail,
				width: parseInt(dimensions.split("x")[0]),
				height: parseInt(dimensions.split("x")[1]),
				mapElements: {
					create: defaultElements.map((element)=>({
						elementId: element.elementId,
						x: element.x,
						y: element.y,
					}))
				}
			}
		})
		res.status(200).json({id: map.id});
		return;
	}
	catch(error){
		res.status(500).json({error: "Failed to create map"});
		return;
	}
	
	
})


export default adminRouter;