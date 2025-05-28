import { Router, Request, Response } from 'express';
import userRouter from './user';
import spaceRouter from './space';
import adminRouter from './admin';
import { SigninSchema, SignupSchema } from '../../types';
import client from '@repo/db/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config';

export const router = Router();

router.post('/signup', async (req, res) => {
    const parsedData = SignupSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ error: 'Validation failed ' + parsedData.error.message });
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(parsedData.data.password, 10);
        const user = await client.user.create({
            data: {
                username: parsedData.data.username,
                password: hashedPassword,
                role: parsedData.data.type === 'admin' ? 'Admin' : 'User',
            },
        });

        res.status(201).json({ userId: user.id });
        return;
    } catch (error) {
        res.status(400).json({ error: 'User already exists' });
        return;
    }
});

router.post('/signin', async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ error: 'Validation failed ' + parsedData.error.message });
        return;
    }

    try {
        const user = await client.user.findUnique({
            where: {
                username: parsedData.data.username,
            },
        });

        if (!user) {
            res.status(400).json({ error: 'User not found' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(parsedData.data.password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ error: 'Invalid password' });
            return;
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);

        res.status(200).json({ token });
        return;
    } catch (error) {
        res.status(400).json({ error: 'User not found' });
        return;
    }
});

router.get('/elements', async (req: Request, res: Response) => {
    try {
        const elements = await client.element.findMany();
        res.status(200).json({elements: elements});
        return;
    } catch (error) {
        res.status(400).json({ error: 'Error fetching elements' });
        return;
    }
});

router.get('/avatars', async (req: Request, res: Response) => {
	try{
		const avatars = await client.avatar.findMany();
		res.status(200).json({avatars: avatars});
		return;
	}
	catch(error){
		res.status(400).json({error: 'Error fetching avatars'});
		return;
	}
});

router.use('/user', userRouter);
router.use('/space', spaceRouter);
router.use('/admin', adminRouter);
