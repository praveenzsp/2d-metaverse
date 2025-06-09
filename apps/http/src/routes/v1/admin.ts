import { Router, Request, Response } from 'express';
import { adminMiddleware } from '../../middleware/admin';
import { CreateAvatarSchema, CreateElementSchema, CreateMapSchema, UpdateElementSchema } from '../../types';
import prisma from '@repo/db/client';

const adminRouter = Router();

adminRouter.post('/element', adminMiddleware, async (req: Request, res: Response) => {
    const parsedData = CreateElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ error: parsedData.error.message });
        return;
    }
    const { imageUrl, width, height, isStatic, name } = parsedData.data;
    try {
        const element = await prisma.element.create({
            data: {
                imageUrl,
                width,
                height,
                static: isStatic,
                name: name
            },
        });
        res.status(200).json({ id: element.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create element' });
        return;
    }
});

adminRouter.get('/element/:elementId', adminMiddleware, async (req: Request, res: Response) => {
    const parsedData = UpdateElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ error: parsedData.error.message });
        return;
    }
    const { imageUrl, name } = parsedData.data;
    try {
        const element = await prisma.element.update({
            where: { id: req.params.elementId },
            data: { 
                imageUrl,
                name: name
            },
        });
        res.status(200).json({ id: element.id });
        return;
    } catch (error) {
        res.status(500).json({ error: 'Failed to update element' });
        return;
    }
});

adminRouter.post('/avatar', adminMiddleware, async (req: Request, res: Response) => {
    const parsedData = CreateAvatarSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ error: parsedData.error.message });
        return;
    }
    const { imageUrl, name } = parsedData.data;

    try {
        const avatar = await prisma.avatar.create({
            data: {
                imageUrl,
                name,
            },
        });
        res.status(200).json({ avatarId: avatar.id });
        return;
    } catch (error) {
        res.status(500).json({ error: 'Failed to create avatar' });
        return;
    }
});

adminRouter.post('/create-map', adminMiddleware, async (req: Request, res: Response) => {
    const parsedData = CreateMapSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ error: parsedData.error.message });
        return;
    }
    const { thumbnail, dimensions, defaultElements, name } = parsedData.data;

    try {
        const map = await prisma.map.create({
            data: {
                name,
                thumbnail,
                width: parseInt(dimensions.split('x')[0]),
                height: parseInt(dimensions.split('x')[1]),
                mapElements: {
                    create: defaultElements.map((element) => ({
                        elementId: element.elementId,
                        x: element.x,
                        y: element.y,
                    })),
                },
            },
        });
        res.status(200).json({ id: map.id });
        return;
    } catch (error) {
        res.status(500).json({ error: 'Failed to create map' });
        return;
    }
});

adminRouter.get('/users', adminMiddleware, async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                avatarId: true,
                avatar: {
                    select: {
                        imageUrl: true,
                        name: true,
                    },
                },
            },
        });

        res.status(200).json({
            users: users.map((user) => ({
                id: user.id,
                username: user.username,
                role: user.role,
                avatar: user.avatar
                    ? {
                          id: user.avatarId,
                          imageUrl: user.avatar.imageUrl,
                          name: user.avatar.name,
                      }
                    : null,
            })),
        });
        return;
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
        return;
    }
});

adminRouter.post('/delete-avatar', adminMiddleware, async (req: Request, res: Response) => {
    const { avatarId } = req.body;

    if (!avatarId) {
        res.status(400).json({ error: 'Avatar ID is required' });
        return;
    }

    try {
        // First get the avatar to get the imageUrl
        const avatar = await prisma.avatar.findUnique({
            where: { id: avatarId },
        });

        if (!avatar) {
            res.status(404).json({ error: 'Avatar not found' });
            return;
        }

        // Delete the avatar from database
        await prisma.avatar.delete({
            where: { id: avatarId },
        });

        res.status(200).json({ message: 'Avatar deleted successfully' });
        return;
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete avatar' });
        return;
    }
});

adminRouter.post('/delete-element', adminMiddleware, async (req: Request, res: Response) => {
    const { elementId } = req.body;

    if (!elementId) {
        res.status(400).json({ error: 'Element ID is required' });
        return;
    }

    try {
        // First get the element to get the imageUrl
        const element = await prisma.element.findUnique({
            where: { id: elementId },
        });

        if (!element) {
            res.status(404).json({ error: 'Element not found' });
            return;
        }

        // Delete the element from database
        await prisma.element.delete({
            where: { id: elementId },
        });

        res.status(200).json({ message: 'Element deleted successfully' });
        return;
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete element' });
        return;
    }
});

adminRouter.put('/update-role', adminMiddleware, async (req: Request, res: Response) => {
    const { userId, role } = req.body;

    if (!userId || !role) {
        res.status(400).json({ error: 'User ID and role are required' });
        return;
    }

    if (role !== 'Admin' && role !== 'User') {
        res.status(400).json({ error: 'Invalid role. Must be either "Admin" or "User"' });
        return;
    }

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                username: true,
                role: true,
                avatarId: true,
                avatar: {
                    select: {
                        imageUrl: true,
                        name: true,
                    },
                },
            },
        });

        res.status(200).json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                avatar: user.avatar
                    ? {
                          id: user.avatarId,
                          imageUrl: user.avatar.imageUrl,
                          name: user.avatar.name,
                      }
                    : null,
            },
        });
        return;
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
        return;
    }
});

adminRouter.get('/maps', adminMiddleware, async (req: Request, res: Response) => {
    try {
        const maps = await prisma.map.findMany({
            select: {
                id: true,
                name: true,
                thumbnail: true,
                width: true,
                height: true,
                mapElements: {
                    select: {
                        elementId: true,
                        x: true,
                        y: true,
                        element: {
                            select: {
                                name: true,
                                imageUrl: true,
                                width: true,
                                height: true,
                                static: true
                            }
                        }
                    }
                }
            }
        });

        res.status(200).json({
            maps: maps.map(map => ({
                id: map.id,
                name: map.name,
                thumbnail: map.thumbnail,
                dimensions: `${map.width}x${map.height}`,
                elements: map.mapElements.map((me: { 
                    elementId: string; 
                    x: number | null; 
                    y: number | null; 
                    element: {
                        name: string;
                        imageUrl: string;
                        width: number;
                        height: number;
                        static: boolean;
                    }
                }) => ({
                    id: me.elementId,
                    x: me.x ?? 0,
                    y: me.y ?? 0,
                    element: me.element
                }))
            }))
        });
        return;
    } catch (error) {
        console.error('Error fetching maps:', error);
        res.status(500).json({ error: 'Failed to fetch maps' });
        return;
    }
});

adminRouter.put('/update-map', adminMiddleware, async (req: Request, res: Response) => {
    const { mapId, name, thumbnail } = req.body;

    if (!mapId) {
        res.status(400).json({ error: 'Map ID is required' });
        return;
    }

    try {
        const map = await prisma.map.update({
            where: { id: mapId },
            data: {
                name: name,
                thumbnail: thumbnail
            },
            select: {
                id: true,
                name: true,
                thumbnail: true,
                width: true,
                height: true,
                mapElements: {
                    select: {
                        elementId: true,
                        x: true,
                        y: true,
                        element: {
                            select: {
                                name: true,
                                imageUrl: true,
                                width: true,
                                height: true,
                                static: true
                            }
                        }
                    }
                }
            }
        });

        res.status(200).json({
            map: {
                id: map.id,
                name: map.name,
                thumbnail: map.thumbnail,
                dimensions: `${map.width}x${map.height}`,
                elements: map.mapElements.map((me: { 
                    elementId: string; 
                    x: number | null; 
                    y: number | null; 
                    element: {
                        name: string;
                        imageUrl: string;
                        width: number;
                        height: number;
                        static: boolean;
                    }
                }) => ({
                    id: me.elementId,
                    x: me.x ?? 0,
                    y: me.y ?? 0,
                    element: me.element
                }))
            }
        });
        return;
    } catch (error) {
        console.error('Error updating map:', error);
        res.status(500).json({ error: 'Failed to update map' });
        return;
    }
});

adminRouter.delete('/delete-map', adminMiddleware, async (req: Request, res: Response) => {
    const { mapId } = req.body;

    if (!mapId) {
        res.status(400).json({ error: 'Map ID is required' });
        return;
    }

    try {
        // First get the map to get the thumbnail URL
        const map = await prisma.map.findUnique({
            where: { id: mapId },
            select: {
                thumbnail: true
            }
        });

        if (!map) {
            res.status(404).json({ error: 'Map not found' });
            return;
        }

        // Delete the map from database
        await prisma.map.delete({
            where: { id: mapId }
        });

        res.status(200).json({ message: 'Map deleted successfully' });
        return;
    } catch (error) {
        console.error('Error deleting map:', error);
        res.status(500).json({ error: 'Failed to delete map' });
        return;
    }
});

adminRouter.post('/add-map-element', adminMiddleware, async (req: Request, res: Response) => {
    const { mapId, elementId, x, y } = req.body;

    if (!mapId || !elementId || x === undefined || y === undefined) {
        res.status(400).json({ error: 'Map ID, Element ID, X, and Y coordinates are required' });
        return;
    }

    try {
        // First check if the map and element exist
        const [map, element] = await Promise.all([
            prisma.map.findUnique({ where: { id: mapId } }),
            prisma.element.findUnique({ where: { id: elementId } })
        ]);

        if (!map) {
            res.status(404).json({ error: 'Map not found' });
            return;
        }

        if (!element) {
            res.status(404).json({ error: 'Element not found' });
            return;
        }

        // Create the map element
        const mapElement = await prisma.mapElements.create({
            data: {
                mapId,
                elementId,
                x,
                y
            },
            include: {
                element: {
                    select: {
                        name: true,
                        imageUrl: true,
                        width: true,
                        height: true,
                        static: true
                    }
                }
            }
        });

        res.status(200).json({
            mapElement: {
                id: mapElement.id,
                x: mapElement.x,
                y: mapElement.y,
                element: mapElement.element
            }
        });
        return;
    } catch (error) {
        console.error('Error adding element to map:', error);
        res.status(500).json({ error: 'Failed to add element to map' });
        return;
    }
});

adminRouter.delete('/delete-map-element', adminMiddleware, async (req: Request, res: Response) => {
    const { mapId, elementId } = req.body;

    if (!mapId || !elementId) {
        res.status(400).json({ error: 'Map ID and Element ID are required' });
        return;
    }

    try {
        // First check if the map element exists
        const mapElement = await prisma.mapElements.findFirst({
            where: {
                mapId,
                elementId
            }
        });

        if (!mapElement) {
            res.status(404).json({ error: 'Map element not found' });
            return;
        }

        // Delete the map element
        await prisma.mapElements.delete({
            where: {
                id: mapElement.id
            }
        });

        res.status(200).json({ message: 'Element removed from map successfully' });
        return;
    } catch (error) {
        console.error('Error removing element from map:', error);
        res.status(500).json({ error: 'Failed to remove element from map' });
        return;
    }
});

export default adminRouter;
