import { userAuthMiddleware } from './../../middleware/user';
import { Router, Request, Response } from "express";
import { AddElementToSpaceSchema, CreateSpaceSchema, DeleteElementFromSpaceSchema } from "../../types";
import prisma from "@repo/db/client";


const spaceRouter=Router();


spaceRouter.post("/create-space", userAuthMiddleware, async (req:Request, res:Response)=>{
	const parsedData = CreateSpaceSchema.safeParse(req.body);

	if(!parsedData.success){
		res.status(400).json({message: "Invalid data"});
		return;
	}

	const {name, dimensions, mapId} = parsedData.data;
	const width = parseInt(dimensions.split("x")[0]);
	const height = parseInt(dimensions.split("x")[1]);

	if(!mapId){
		try{
			const space = await prisma.space.create({
				data: {
					name,
					width,
					height,
					creatorId: req.userId,
				}
			})
	
			res.status(200).json({spaceId: space.id});
			return;
		}
		catch(error){
			res.status(400).json({message: "Internal server error"});
			return;
		}
	}
	else{
		//if the mapId is present then we have to create a space and then copy all the elements from the map to the newly created space
		try {
			// First verify the map exists and get its elements
			const map = await prisma.map.findUnique({
				where: { id: mapId },
				select: {
					id: true,
					width: true,
					height: true,
					mapElements: {
						select: {
							elementId: true,
							x: true,
							y: true
						}
					}
				}
			});

			if (!map) {
				res.status(404).json({ message: "Map not found" });
				return;
			}

			// Use a transaction to ensure all operations succeed or fail together
			const result = await prisma.$transaction(async (tx:any) => {
				// Create the new space
				const space = await tx.space.create({
					data: {
						name,
						width: map.width,
						height: map.height,
						creatorId: req.userId,
					}
				});

				// Copy all map elements to the space
				if (map.mapElements.length > 0) {
					await tx.spaceElements.createMany({
						data: map.mapElements.map((mapElement:any) => ({
							spaceId: space.id,
							elementId: mapElement.elementId,
							x: mapElement.x ?? 0, // Default to 0 if x is null
							y: mapElement.y ?? 0  // Default to 0 if y is null
						}))
					});
				}

				return space;
			});

			res.status(200).json({ 
				spaceId: result.id,
			});
			return;
		}
		catch (error) {
			res.status(500).json({ message: "Failed to create space from map" });
			return;
		}
	}
})

spaceRouter.delete("/:spaceId", userAuthMiddleware, async (req: Request, res: Response)=>{
	const {spaceId} = req.params;

	const space = await prisma.space.findUnique({
		where: {id: spaceId},
		select: {
			creatorId: true,
		}
	})

	if(!space){
		res.status(404).json({message: "Space not found"});
		return;
	}

	if(space.creatorId!=req.userId){
		res.status(403).json({message: "You are not authorized to delete this space"});
		return;
	}

	try{
		await prisma.space.delete({
			where: {id: spaceId}
		})

		res.status(200).json({message: "Space deleted successfully"});
		return;
	}
	catch(error){
		res.status(400).json({message: "Internal server error"});
		return;
	}
})

spaceRouter.get("/all", userAuthMiddleware, async (req: Request, res: Response)=>{
	try{
		const spaces = await prisma.space.findMany({
			where: {
				creatorId: req.userId
			},
			select: {
				id: true,
				name: true,
				width: true,
				height: true,
				thumbnail: true,
			}
		})

		res.status(200).json({spaces: spaces.map((space:any)=>({
			id: space.id,
			name: space.name,
			dimensions: `${space.width}x${space.height}`,
			thumbnail: space.thumbnail,
		}))});
		return;
	}
	catch(error){
		res.status(400).json({message: "Internal server error"});
		return;
	}
})

spaceRouter.post("/element", userAuthMiddleware, async (req:Request, res:Response)=>{
	// this route is abt adding the existing element to the space, no need to create a new element
	const parsedData = AddElementToSpaceSchema.safeParse(req.body);

	if(!parsedData.success){
		res.status(400).json({message: "Invalid data"});
		return;
	}

	const {spaceId, elementId, x, y} = parsedData.data;

	const space = await prisma.space.findUnique({
		where: {id: spaceId},
		select: {
			creatorId: true,
			width: true,
			height: true,
		}
	})

	//condition to check if the element is within the space dimensions
	if(x<0 || x>space?.width! || y<0 || y>space?.height!){
		res.status(400).json({message: "Element is out of space dimensions"});
		return;
	}

	if(!space){
		res.status(404).json({message: "Space not found"});
		return;
	}

	if(space.creatorId!=req.userId){
		res.status(403).json({message: "You are not authorized to add elements to this space"});
		return;
	}
	
	try{
		await prisma.spaceElements.create({
			data: {
				spaceId,
				elementId,
				x,
				y
			}
		})
	
		res.status(200).json({message: "Element added to space successfully"});
		return;
	}
	catch(error){
		res.status(400).json({message: "Internal server error"});
		return;
	}
})

spaceRouter.delete("/element", userAuthMiddleware, async (req:Request, res:Response)=>{
	// this route is abt deleting the existing element from the space, no need to delete the element from the database
	const parsedData = DeleteElementFromSpaceSchema.safeParse(req.body);

	if(!parsedData.success){
		res.status(400).json({message: "Invalid data"});
		return;
	}

	const {id} = parsedData.data; // this id is from the spaceElements table


	try{
		const spaceElement = await prisma.spaceElements.findUnique({
			where: {
				id: id
			},
			include:{
				space: {
					select: {
						creatorId: true,
					}
				},
			}
		})

		if(spaceElement?.space.creatorId!=req.userId){
			res.status(403).json({message: "You are not authorized to delete this element"});
			return;
		}

		await prisma.spaceElements.delete({
			where: {
				id: id
			}
		})
		res.status(200).json({message: "Element deleted from space successfully"});
		return;
	}
	catch(error){
		res.status(400).json({message: "Internal server error"});
		return;
	}
})

spaceRouter.get("/:spaceId", userAuthMiddleware, async (req:Request, res:Response)=>{
	// this route is abt getting the space elements, no need to check if the user is the creator of the space
	const {spaceId} = req.params;

	try{
		const space = await prisma.space.findUnique({
			where: {id: spaceId},
			select: {
				name: true,
				width: true,
				height: true,
			}	
		})

		if(!space){
			res.status(404).json({message: "Space not found"});
			return;
		}

		const spaceElements = await prisma.spaceElements.findMany({
			where: {
				spaceId: spaceId
			},
			include: {
				element: true
			}
		});

		const response = {
			dimensions: `${space.width}x${space.height}`,
			elements: spaceElements.map((spaceElement:any) => ({
				id: spaceElement.id,
				element: {
					id: spaceElement.element.id,
					image: spaceElement.element.imageUrl,
					height: spaceElement.element.height,
					width: spaceElement.element.width,
					static: spaceElement.element.static,
				},
				x: spaceElement.x,
				y: spaceElement.y,
			}))
		};

		res.status(200).json(response);
		return;
		
	}
	catch(error){
		res.status(400).json({message: "Internal server error"});
		return;
	}
})

export default spaceRouter;