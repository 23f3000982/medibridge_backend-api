import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const PackageCache = {
    lastFetchedAT: 0,
    data: null,
    fetchingPromise: null, // track ongoing fetch
};
const PKC_CACHE_DURATION_MS = 10 * 1000; // 10 seconds

export async function getAllPackages(forceFetch = false) {
    const currTime = Date.now();

    // ✅ if cache is still valid → return cached data
    if (PackageCache.data && (currTime - PackageCache.lastFetchedAT < PKC_CACHE_DURATION_MS) && !forceFetch) {
        console.log("🗂️  Using cached package data");
        return PackageCache.data;
    }

    // ✅ if another fetch is already happening → wait 100ms and retry
    if (PackageCache.fetchingPromise) {
        console.log("⏳ Another fetch in progress, waiting 100ms…");
        await new Promise(r => setTimeout(r, 100));
        return getAllPackages(); // try again
    }

    try {
        // ✅ mark fetch as in progress
        PackageCache.fetchingPromise = true
        const allPackages = await sequelize.query(
            `
            SELECT
                p.*,
                s.id AS sub_package_id,
                s.name AS sub_package_name,
                s.slug AS sub_package_slug,
                s.crelio_id AS sub_package_crelio_id,
                s.price AS sub_package_price,
                s.tat AS sub_package_tat,
                s.description AS sub_package_description,
                s.icon AS sub_package_icon,
                s.model_image AS sub_package_model_image,
                COALESCE(ARRAY_AGG(st.test_id) FILTER (WHERE st.test_id IS NOT NULL), '{}') AS sub_package_test_id
            FROM medibridge.package p
            LEFT JOIN medibridge.sub_packages s ON s.package_id = p.id
            LEFT JOIN medibridge.sub_package_tests st ON st.sub_package_id = s.id
            GROUP BY p.id, s.id
            ORDER BY p.id ASC;
            `,
            { type: QueryTypes.SELECT }
        );

        let toCache = [];
        // Use forEach to build unique packages
        allPackages.forEach((eachPackage) => {
            const {
                id, name, slug, title, description, icon, model_image,
                sub_package_id, sub_package_name, sub_package_slug, sub_package_crelio_id,
                sub_package_price, sub_package_tat, sub_package_description,
                sub_package_icon, sub_package_model_image, sub_package_test_id
            } = eachPackage;

            // Check if package already exists
            let existing = toCache.find(p => p.id === id);
            if (!existing) {
                existing = {
                    id,
                    name,
                    slug,
                    title,
                    description,
                    icon,
                    modelImage: model_image,
                    subPackages: []
                };
                toCache.push(existing);
            }

            // Only push sub-package if it doesn't already exist
            if (sub_package_id && sub_package_name) {
                const subExists = existing.subPackages.find(sp => sp.id === sub_package_id);
                if (!subExists) {
                    existing.subPackages.push({
                        id: sub_package_id,
                        name: sub_package_name,
                        price: sub_package_price,
                        slug: sub_package_slug,
                        crelioId: sub_package_crelio_id,
                        tat: sub_package_tat,
                        description: sub_package_description,
                        icon: sub_package_icon,
                        modelImage: sub_package_model_image,
                        testIds: sub_package_test_id
                            ? Array.isArray(sub_package_test_id)
                                ? sub_package_test_id
                                : sub_package_test_id.toString().split(',').map(Number)
                            : []
                    });
                }
            }
        });

        PackageCache.data = toCache;
        PackageCache.lastFetchedAT = Date.now();

        return toCache;

    } catch (error) {
        console.error("❌ Error fetching packages:", error);
        return false;
    } finally {
        // ✅ clear the promise so new fetches can start
        PackageCache.fetchingPromise = null;
    }
}
