import { z } from "zod";

export const SignupSchema = z.object({
    username: z.string().email(),
    password: z.string().min(8),
    type: z.enum(["admin", "user"]),
});

export const SigninSchema = z.object({
    username: z.string().email(),
    password: z.string().min(8),
});

export const UpdateMetadataSchema = z.object({
    avatarId: z.string(),
});

export const CreateSpaceSchema = z.object({
    name: z.string(),
	// validate dimensions as a string of 100x200
	dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
	mapId: z.string(),
});

export const AddElementToSpaceSchema = z.object({
	elementId: z.string(),
	spaceId: z.string(),
	x: z.number(),
	y: z.number(),
});

export const DeleteElementFromSpaceSchema = z.object({
	id: z.string(),

});

export const CreateElementSchema = z.object({
	imageUrl: z.string(),
	width: z.number(),
	height: z.number(),
	isStatic: z.boolean(),
	name: z.string(),
});

export const UpdateElementSchema = z.object({
	imageUrl: z.string(),
	name: z.string().optional(),
});

export const CreateAvatarSchema = z.object({
	imageUrl: z.string(),
	name: z.string(),
});

export const CreateMapSchema = z.object({
	name: z.string(),
	thumbnail: z.string(),
	dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
	defaultElements: z.array(z.object({
		elementId: z.string(),
		x: z.number(),
		y: z.number(),
	}))
});

declare global {
	namespace Express {
		interface Request {
			userId: string;
		}
	}
}



