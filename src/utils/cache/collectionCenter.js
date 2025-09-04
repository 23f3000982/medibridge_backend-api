import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const CCCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const CC_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function getAllCollectionCenter(forceFetch = false) {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (CCCache.data && (currTime - CCCache.lastFetchedAT < CC_CACHE_DURATION_MS) && !forceFetch) {
        console.log("🗂️  Using cached collection center data");
        return CCCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (CCCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getAllCollectionCenter(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        CCCache.fetchingPromise = true
        const allCC = await sequelize.query(
            `
            SELECT
                *
            FROM medibridge.collection_centers
            ORDER BY id DESC
            `,
            { type: QueryTypes.SELECT }
        );

        if (!allCC) {
            CCCache.fetchingPromise = null;
            return false;
        }

        // ✅ map over the result and rename the property
        const mappedCC = allCC.map((eachCC) => {
            const { center_name, address, location_url, contact, id } = eachCC;

            const toCache = {
                id,
                link: location_url,
                name: center_name,
                address,
                contact
            };
            return toCache;
        });

        CCCache.data = mappedCC;
        CCCache.lastFetchedAT = Date.now();

        return mappedCC;
    } catch (error) {
        console.error("❌ Error fetching collection centers:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        CCCache.fetchingPromise = null;
    }
}
