import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const allImagesCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const IMAGES_CACHE_DURATION_MS = 10 * 1000; // 1

export async function getAllImages(forceFetch = false) {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (allImagesCache.data && (currTime - allImagesCache.lastFetchedAT < IMAGES_CACHE_DURATION_MS) && !forceFetch) {
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
        allImagesCache.fetchingPromise = true
        const allImages = await sequelize.query(
            `
            SELECT
                *
            FROM medibridge.images
            ORDER BY id DESC
            `,
            { type: QueryTypes.SELECT }
        );

        if (!allImages) {
            allImagesCache.fetchingPromise = null;
            return false;
        }

        // ✅ map over the result and rename the property
        const mappedImages = allImages.map((dept) => {
            const { id, link, name, hash, height, width, size, format, blur_hash } = dept;

            const toCache = {
                id,
                link,
                name,
                hash,
                height,
                width,
                size,
                format,
                blurHash: blur_hash

            }
            return toCache;
        });

        allImagesCache.data = mappedImages;
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

// department cache

const allDepartmentsCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const DEPARTMENTS_CACHE_DURATION_MS = 10 * 1000; // 10 seconds

export async function getAllDepartments(forceFetch = false) {
    const currTime = Date.now();
    if (
        allDepartmentsCache.data &&
        (currTime - allDepartmentsCache.lastFetchedAT < DEPARTMENTS_CACHE_DURATION_MS) &&
        !forceFetch
    ) {
        console.log("🗂️  Using cached departments data");
        return allDepartmentsCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (allDepartmentsCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getAllDepartments(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        allDepartmentsCache.fetchingPromise = true
        const allDepartments = await sequelize.query(
            `
            SELECT 
                d.*,
                COUNT(t.test_id) AS total_tests
            FROM medibridge.departments d
            LEFT JOIN medibridge.tests t 
                ON t.department_id = d.code
            GROUP BY d.id
            ORDER BY COUNT(t.test_id) DESC
            ;
        `,
            { type: QueryTypes.SELECT }
        );

        // ✅ map over the result and rename the property
        const mappedDepartments = allDepartments.map((dept) => {
            const { total_tests, ...rest } = dept;
            return {
                ...rest,
                testCount: Number(total_tests) || 0,
            };
        });

        allDepartmentsCache.data = mappedDepartments;
        allDepartmentsCache.lastFetchedAT = Date.now();
        return allDepartmentsCache.data;

    } catch (error) {
        console.error("❌ Error fetching departments:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        allDepartmentsCache.fetchingPromise = null;
    }
}

