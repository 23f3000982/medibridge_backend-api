import sharp from "sharp";
import multer from "multer";
import fs from "fs";
import path from "path";
import { uploadFile } from "../utils/irys/irys.js";
import express from "express";

const uploadImageRouter = express.Router();

uploadImageRouter.use((req, res, next) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }
    next()
})

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

uploadImageRouter.use(upload.single("image")); // <-- field MUST be "image"

import crypto from "crypto"; // for hash
import { sequelize } from "../utils/postgress/postgress.js";
import { imageToBlurhash } from "../utils/irys/imageHash.js";

uploadImageRouter.use(async (req, res) => {
    const { name } = req.body;

    if (!req.file) return res.status(400).json({ ok: false, error: "No file provided" });

    // Allowed types
    const allowedMime = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedMime.includes(req.file.mimetype)) {
        return res.status(400).json({ ok: false, error: "Unsupported file type" });
    }

    try {
        const safeName = name.replace(/\s+/g, "_");
        //check folder and create if not
        const originalPath = path.join(process.cwd(), "public", "original");
        const webpPath = path.join(process.cwd(), "public", "webp");
        fs.mkdirSync(originalPath, { recursive: true });
        fs.mkdirSync(webpPath, { recursive: true });


        // check the final name for the images
        let originalFileName = getUniqueFileName(originalPath, `${safeName}.${req.file.mimetype.split("/")[1]}`);
        let webpFileName = getUniqueFileName(webpPath, `${safeName}.webp`);
        const originalFullPath = path.join(originalPath, originalFileName);
        const webpFullPath = path.join(webpPath, webpFileName);


        // Convert to WebP (always webp only)
        const webpBuffer = await sharp(req.file.buffer)
            .rotate()
            .webp({ quality: 80 })
            .toBuffer();

        // Calculate SHA256 hash of webp
        const webpHash = crypto.createHash("sha256").update(webpBuffer).digest("hex");
        // Get image metadata (width/height)
        const metadata = await sharp(webpBuffer).metadata();

        // Save to filesystem
        fs.writeFileSync(originalFullPath, req.file.buffer);
        fs.writeFileSync(webpFullPath, webpBuffer);

        // Upload to Irys
        const imageUrl = await uploadFile(webpFullPath);
        const blurHash = await imageToBlurhash(imageUrl);
        // Save in DB (only webp)
        await sequelize.query(
            `
            INSERT INTO 
            medibridge.images (link, name, hash, height, width, size, format, blur_hash)
            VALUES (:link, :name, :hash, :height, :width, :size, :format, :blurHash)
            `,
            {
                replacements: {
                    link: imageUrl,
                    name: webpFileName,
                    hash: webpHash,
                    height: metadata.height || 0,
                    width: metadata.width || 0,
                    size: Math.floor(webpBuffer.length / 1024),
                    format: "webp",
                    blurHash: blurHash,
                }
            }
        );
        res.json({
            success: true,
            url: imageUrl,
        });

    } catch (error) {
        console.error("❌ Error processing image:", error);
        res.status(500).json({ ok: false, error: "Internal Server Error" });
    }
});



export default uploadImageRouter;


function getUniqueFileName(dir: string, fileName: string) {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    let uniqueName = fileName;
    let counter = 1;

    while (fs.existsSync(path.join(dir, uniqueName))) {
        uniqueName = `${base}_${counter}${ext}`;
        counter++;
    }
    return uniqueName;
}