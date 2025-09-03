import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const allParameterCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const PARAMETERS_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function getAllParameters(forceFetch = false) {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (allParameterCache.data && (currTime - allParameterCache.lastFetchedAT < PARAMETERS_CACHE_DURATION_MS) && !forceFetch) {
        console.log("🗂️  Using cached parameters data");
        return allParameterCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (allParameterCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getAllParameters(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        allParameterCache.fetchingPromise = true
        const allParameters = await sequelize.query(
            `
            SELECT
                *
            FROM medibridge.parameters
            ORDER BY id ASC
            `,
            { type: QueryTypes.SELECT }
        );

        if (!allParameters) {
            allParameterCache.fetchingPromise = null;
            return false;
        }

        // ✅ map over the result and rename the property
        const mappedParameters = allParameters.map((parameters) => {
            const { id, name, parameter_code } = parameters;

            const toCache = {
                id,
                name,
                code: parameter_code
            }
            return toCache;
        });

        allParameterCache.data = mappedParameters;
        allParameterCache.lastFetchedAT = Date.now();

        return allParameterCache.data;

    } catch (error) {
        console.error("❌ Error fetching parameters:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        allParameterCache.fetchingPromise = null;
    }
}

