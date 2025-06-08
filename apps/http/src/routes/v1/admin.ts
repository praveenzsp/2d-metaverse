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

adminRouter.post('/map', adminMiddleware, async (req: Request, res: Response) => {
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

export default adminRouter;
