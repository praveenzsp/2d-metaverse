import express from "express";
import { router } from "./routes/v1";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// CORS configuration
app.use(cors({
	origin: process.env.FRONTEND_URL || "http://localhost:3000", // Specify the exact origin
	credentials: true, // Allow credentials (cookies)
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
}));

// Parse cookies
app.use(cookieParser());

// Parse JSON bodies
app.use(express.json());

// API routes
app.use("/api/v1", router);

app.listen(process.env.PORT || 8080, ()=>{
	console.log("Server is running on port 8080");
})