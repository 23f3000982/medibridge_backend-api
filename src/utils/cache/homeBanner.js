import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const BannerCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const BANNER_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function getAllBanners(forceFetch = false) {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (BannerCache.data && (currTime - BannerCache.lastFetchedAT < BANNER_CACHE_DURATION_MS) && !forceFetch) {
        console.log("🗂️  Using cached banner data");
        return BannerCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (BannerCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getAllBanners(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        BannerCache.fetchingPromise = true
        const allBanners = await sequelize.query(
            `
            SELECT
                *
            FROM medibridge.home_banners
            ORDER BY id ASC
            `,
            { type: QueryTypes.SELECT }
        );

        // ✅ map over the result and rename the property
        const mappedBanners = allBanners.map((eachBanner) => {
            const { id, title, redirect_url, desktop_image, phone_image, description } = eachBanner;

            const toCache = {
                id,
                title: title,
                redirectUrl: redirect_url,
                phoneImage: phone_image,
                desktopImage: desktop_image,
                description: description
            };
            return toCache;
        });

        BannerCache.data = mappedBanners;
        BannerCache.lastFetchedAT = Date.now();

        return mappedBanners;
    } catch (error) {
        console.error("❌ Error fetching banners:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        BannerCache.fetchingPromise = null;
    }
}
