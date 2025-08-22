import { QueryTypes } from "sequelize";
import { sequelize } from "../utils/postgress/postgress.js";

const allImagesCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};

export async function getAllImages() {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (allImagesCache.data && (currTime - allImagesCache.lastFetchedAT < 5 * 60 * 1000)) {
        console.log("🗂️  Using cached images data");
        return allImagesCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (allImagesCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getAllImages(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        allImagesCache.fetchingPromise = sequelize.query(
            `SELECT * FROM medibridge.images`,
            { type: QueryTypes.SELECT }
        );

        const allImages = await allImagesCache.fetchingPromise;

        if (!allImages) {
            allImagesCache.fetchingPromise = null;
            return false;
        }

        allImagesCache.data = allImages;
        allImagesCache.lastFetchedAT = Date.now();

        return allImages;

    } catch (error) {
        console.error("❌ Error fetching images:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        allImagesCache.fetchingPromise = null;
    }
}
