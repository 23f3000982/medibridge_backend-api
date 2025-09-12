import sharp from "sharp";
import { encode } from "blurhash";
import { sequelize } from "../postgress/postgress.js";
import { getAllImages } from "../cache/cache.js";
import { QueryTypes } from "sequelize";
export async function imageToBlurhash(url) {
    // fetch the image as a buffer
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // shrink + convert to RGBA for blurhash
    const { data, info } = await sharp(buf)
        .resize(32, 32, { fit: "inside" }) // small size = faster
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    // encode blurhash
    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
}
export async function updateBlurHash() {
    console.log("🔄 Updating blurhash for all images...");
    const allImages = await getAllImages(true);
    for (const image of allImages) {
        try {
            const blurhash = await imageToBlurhash(image.link);
            await sequelize.query(`UPDATE 
                medibridge.images
                SET blur_hash = :blurHash
                WHERE image_id = :imageId
                `, {
                replacements: {
                    blurHash: blurhash,
                    imageId: image.imageId,
                },
                type: QueryTypes.UPDATE,
            });
        }
        catch (err) {
            if (err instanceof Error) {
                console.error("❌ Error processing", image.link, err.message);
            }
            else {
                console.error("❌ Unknown error processing", image.link, err);
            }
        }
    }
}
