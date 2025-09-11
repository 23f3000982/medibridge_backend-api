import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const popularTestCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const PT_CACHE_DURATION_MS = 10 * 1000; // 10 seconds

export async function getPopularTests(forceFetch = false) {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (popularTestCache.data && (currTime - popularTestCache.lastFetchedAT < PT_CACHE_DURATION_MS) && !forceFetch) {
        console.log("🗂️  Using cached tests data");
        return popularTestCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (popularTestCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getPopularTests(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        popularTestCache.fetchingPromise = true
        const allPopularTests = await sequelize.query(
            `
            SELECT
                pt.id AS position,
                t.*,
                COALESCE(
                    JSONB_AGG(
                    DISTINCT jsonb_build_object(
                        'id', p.id,
                        'name', p.name,
                        'parameter_code', p.parameter_code
                    )
                    ) FILTER (WHERE p.id IS NOT NULL),
                    '[]'::jsonb
                ) AS parameters

            FROM medibridge.popular_test pt
            LEFT JOIN medibridge.test t ON pt.test_id = t.id
            LEFT JOIN medibridge.test_parameters tp ON pt.test_id = tp.test_id
            LEFT JOIN medibridge.parameters p ON tp.parameter = p.parameter_code
            GROUP BY pt.id, t.id
            ORDER BY pt.id ASC
            `,
            { type: QueryTypes.SELECT }
        );

        const cleanedTests = allPopularTests.map(test => ({
            ...test,
            parameters: test.parameters.filter(param =>
                param.name !== null && param.id !== null && param.parameter_code !== null
            )
        }));
        if (!cleanedTests) {
            allPopularTests.fetchingPromise = null;
            return false;
        }

        // ✅ map over the result and rename the property
        const mappedTests = cleanedTests.reduce((acc, test) => {
            const {
                position,
                id,
                name,
                crelio_id,
                department,
                tat,
                sample_id,
                slug,
                model_image,
                icon,
                description,
                fasting_required,
                base_price,
                status,
                parameters
            } = test;

            acc[position] = {
                id,
                name,
                basePrice: base_price,
                crelioId: crelio_id,
                department,
                tat: tat,
                sampleId: sample_id,
                slug,
                modelImage: model_image,
                icon,
                description,
                fastingRequired: fasting_required,
                status,
                parameters: parameters || [],
            };

            return acc;
        }, {});


        popularTestCache.data = mappedTests;
        popularTestCache.lastFetchedAT = Date.now();

        return popularTestCache.data;

    } catch (error) {
        console.error("❌ Error fetching tests:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        popularTestCache.fetchingPromise = null;
    }
}

