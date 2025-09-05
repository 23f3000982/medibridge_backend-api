import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const allTestCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const TESTS_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function getAllTests(forceFetch = false) {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (allTestCache.data && (currTime - allTestCache.lastFetchedAT < TESTS_CACHE_DURATION_MS) && !forceFetch) {
        console.log("🗂️  Using cached tests data");
        return allTestCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (allTestCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getAllTests(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        allTestCache.fetchingPromise = true
        const allTests = await sequelize.query(
            `
            SELECT
                t.*, 
                ARRAY_AGG(
                 p.parameter_code
                    
                ) AS parameters  -- Aggregate parameters as JSON objects
            FROM medibridge.test t
            LEFT JOIN medibridge.test_parameters tp ON t.id = tp.test_id
            LEFT JOIN medibridge.parameters p ON tp.parameter = p.parameter_code
            GROUP BY t.id
            ORDER BY t.id ASC
            `,
            { type: QueryTypes.SELECT }
        );

        const cleanedTests = allTests.map(test => ({
            ...test,
            // parameters: test.parameters.filter(param =>
            //     param.name !== null && param.id !== null && param.parameter_code !== null
            // )
        }));
        if (!cleanedTests) {
            allTestCache.fetchingPromise = null;
            return false;
        }

        // ✅ map over the result and rename the property
        const mappedTests = cleanedTests.map((test) => {
            const { id, name, crelio_id, department, tat_minutes, sample_id, slug, model_image, icon, description, fasting_required, base_price, status, parameters } = test;

            console.log(test);

            const toCache = {
                name,
                base_price,
                crelio_id,
                department,
                tat_minutes,
                sample_id,
                slug,
                model_image,
                icon,
                description,
                fasting_required,
                status,
                id,
                parameters: parameters || [],

            }
            console.dir(toCache, { depth: null, colors: true });
            return toCache;
        });

        allTestCache.data = mappedTests;
        allTestCache.lastFetchedAT = Date.now();

        return allTestCache.data;

    } catch (error) {
        console.error("❌ Error fetching tests:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        allTestCache.fetchingPromise = null;
    }
}

