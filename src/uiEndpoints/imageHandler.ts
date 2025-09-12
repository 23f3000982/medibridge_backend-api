import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";

const imageHandler = express.Router();

// Serve dynamic images from /public/xyz/... paths
imageHandler.use((req: Request, res: Response) => {
    if (req.method !== "GET") {
        res.status(405).json({
            success: false,
            message: "Method not allowed",
        });
        return;
    }
    const parts = req.path.split("/").filter(Boolean);
    console.log("parts", parts);
    const filePath = path.join(process.cwd(), "public", ...parts); // join into full path

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    return res.status(404).json({ success: false, message: "Image not found" });
});

export default imageHandler;
