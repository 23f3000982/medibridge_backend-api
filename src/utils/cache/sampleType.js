import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const sampleTypeCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const SAMPLE_CACHE_DURATION_MS = 1 * 60 * 1000; // 5 minutes

export async function getAllSampleType(forceFetch = false) {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (sampleTypeCache.data && (currTime - sampleTypeCache.lastFetchedAT < SAMPLE_CACHE_DURATION_MS) && !forceFetch) {
        console.log("🗂️  Using cached sample type data");
        return sampleTypeCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (sampleTypeCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getAllSampleType(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        sampleTypeCache.fetchingPromise = true
        const allSampleTypes = await sequelize.query(
            `
            SELECT
                *
            FROM medibridge.sample_type
            ORDER BY id DESC
            `,
            { type: QueryTypes.SELECT }
        );

        if (!allSampleTypes) {
            sampleTypeCache.fetchingPromise = null;
            return false;
        }

        // ✅ map over the result and rename the property
        const mappedSampleTypes = allSampleTypes.map((eachSampleType) => {
            const { id, name, icon } = eachSampleType;

            const toCache = {
                id,
                name,
                icon,
            };
            return toCache;
        });

        sampleTypeCache.data = mappedSampleTypes;
        sampleTypeCache.lastFetchedAT = Date.now();

        return mappedSampleTypes;
    } catch (error) {
        console.error("❌ Error fetching sample types:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        sampleTypeCache.fetchingPromise = null;
    }
}
