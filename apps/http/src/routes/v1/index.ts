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
                email: parsedData.data.email,
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
                email: parsedData.data.email,
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

        // Set HTTP-only cookie with the JWT token
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only send cookie over HTTPS in production
            sameSite: 'strict', // Protect against CSRF
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/', // Cookie is available for all paths
        });

        // Send user info without sensitive data
        res.status(200).json({ 
            userId: user.id,
            role: user.role,
            message: 'Successfully signed in'
        });
        return;
    } catch (error) {
        res.status(400).json({ error: 'User not found' });
        return;
    }
});

router.get('/auth/me', async (req, res) => {
    try {
        // Get the auth token from cookies
        const token = req.cookies.auth_token;

        if (!token) {
            res.status(401).json({ error: 'No authentication token found' });
            return;
        }

        // Verify and decode the token
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string };

        // Get user info from database
        const user = await client.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                // Add other non-sensitive fields you want to return
            }
        });

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        res.status(200).json({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: token
        });
        return;
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});


// Add a signout endpoint to clear the cookie
router.post('/signout', (req, res) => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });
    res.status(200).json({ message: 'Successfully signed out' });
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

router.get('/maps', async (req: Request, res: Response) => {
    try{
        const maps = await client.map.findMany();
        res.status(200).json({maps: maps});
        return;
    }
    catch(error){
        res.status(400).json({error: 'Error fetching maps'});
        return;
    }
});

router.use('/user', userRouter);
router.use('/space', spaceRouter);
router.use('/admin', adminRouter);
