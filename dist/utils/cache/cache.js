import { QueryTypes } from "sequelize";
import { UnifiedCache } from "../classes/cacheClass.js";
import { sequelize } from "../postgress/postgress.js";
export async function getAllImages(forceFetch = false) {
    console.log("🗂️  Fetching all images from cache or DB");
    let allImages = await UnifiedCache.getData("allImages");
    if (allImages && !forceFetch) {
        return allImages;
    }
    UnifiedCache.setFetchingStatus("allImages", true);
    try {
        const fetchedImages = await sequelize.query(`
            SELECT
                *
            FROM medibridge.images
            ORDER BY image_id DESC
            `, { type: QueryTypes.SELECT });
        if (!fetchedImages) {
            return [];
        }
        // ✅ map over the result and rename the property
        const mappedImages = fetchedImages.map((img) => {
            const { image_id, link, name, hash, height, width, size, format, blur_hash, created_at, updated_at } = img;
            const toCache = {
                imageId: image_id,
                link: link,
                name: name,
                hash: hash,
                height: height,
                width: width,
                size: size,
                format: format,
                blurHash: blur_hash,
                createdAt: created_at,
                updatedAt: updated_at,
            };
            return toCache;
        });
        UnifiedCache.setData("allImages", mappedImages);
        return mappedImages;
    }
    catch (error) {
        console.error("❌ Error fetching images:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allImages", false);
    }
}
// department cache
export async function getAllDepartments(forceFetch = false) {
    let allDepartmentsCache = await UnifiedCache.getData("allDepartments");
    if (allDepartmentsCache && !forceFetch) {
        console.log("🗂️  Using cached departments data");
        return allDepartmentsCache;
    }
    UnifiedCache.setFetchingStatus("allDepartments", true);
    try {
        const allDepartments = await sequelize.query(`
            SELECT 
                d.*,
                i.blur_hash,
                COUNT(t.test_id) AS total_tests
            FROM medibridge.departments d
            LEFT JOIN
                medibridge.test t ON t.dept_code = d.dept_code
            LEFT JOIN medibridge.images i ON i.link = d.image
            GROUP BY d.dept_id,i.blur_hash
            ORDER BY COUNT(t.test_id) DESC
            ;
        `, { type: QueryTypes.SELECT });
        // ✅ map over the result and rename the property
        const mappedDepartments = allDepartments.map(async (dept) => {
            const { blur_hash, total_tests, ...rest } = dept;
            const toCache = {
                departmentId: rest.dept_id,
                deptCode: rest.dept_code,
                name: rest.name,
                image: rest.image,
                imageHash: blur_hash,
                description: rest.description,
                totalTests: parseInt(total_tests) || 0,
            };
            return toCache;
        });
        const allDepartmentData = await Promise.all(mappedDepartments);
        UnifiedCache.setData("allDepartments", allDepartmentData);
        return allDepartmentData;
    }
    catch (error) {
        console.error("❌ Error fetching departments:", error);
        return false;
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allDepartments", false);
    }
}
//sample Cache
export async function getAllSamples(forceFetch = false) {
    let allSamples = await UnifiedCache.getData("allSamples");
    if (allSamples && !forceFetch) {
        console.log("🗂️  Using cached sample types data");
        return allSamples;
    }
    UnifiedCache.setFetchingStatus("allSamples", true);
    try {
        const allSamples = await sequelize.query(`
            SELECT * FROM medibridge.samples
            `, { type: QueryTypes.SELECT });
        // ✅ map over the result and rename the property
        const mappedSampleTypes = allSamples.map((type) => {
            const { sample_id, name, icon } = type;
            const toCache = {
                sampleId: sample_id,
                name: name,
                icon: icon,
            };
            return toCache;
        });
        UnifiedCache.setData("allSamples", mappedSampleTypes);
        return mappedSampleTypes;
    }
    catch (error) {
        console.error("❌ Error fetching sample types:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allSamples", false);
    }
}
//Parameters cache
export async function getAllParameters(forceFetch = false) {
    let allParameters = await UnifiedCache.getData("allParameters");
    if (allParameters && !forceFetch) {
        console.log("🗂️  Using cached parameters data");
        return allParameters;
    }
    UnifiedCache.setFetchingStatus("allParameters", true);
    try {
        const allParameters = await sequelize.query(`
            SELECT *
            FROM medibridge.parameters
            ORDER BY parameter_id DESC
            `, { type: QueryTypes.SELECT });
        // ✅ map over the result and rename the property
        const mappedParameters = allParameters.map((param) => {
            const { parameter_id, name, parameter_code } = param;
            const toCache = {
                parameterId: parameter_id,
                name: name,
                parameterCode: parameter_code,
            };
            return toCache;
        });
        UnifiedCache.setData("allParameters", mappedParameters);
        return mappedParameters;
    }
    catch (error) {
        console.error("❌ Error fetching parameters:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allParameters", false);
    }
}
//Tests cache
export async function getAllTests(forceFetch = false) {
    let allTests = await UnifiedCache.getData("allTests");
    if (allTests && !forceFetch) {
        console.log("🗂️  Using cached tests data");
        return allTests;
    }
    UnifiedCache.setFetchingStatus("allTests", true);
    try {
        const allTests = await sequelize.query(`
            SELECT 
                t.*,
                COALESCE(
                    JSONB_AGG(DISTINCT p.parameter_code)
                        FILTER (WHERE p.parameter_code IS NOT NULL),
                    '[]'::jsonb
                ) AS parameters,
                COALESCE(
                    JSONB_AGG(
                        DISTINCT 
                        JSONB_BUILD_OBJECT(
                            'name', p.name,
                            'parameter_code', p.parameter_code
                        ) 
                        -- Apply FILTER after the aggregation
                    ) FILTER (WHERE p.parameter_code IS NOT NULL),
                    '[]'::jsonb
                ) AS parameter_info
            FROM medibridge.test t
            LEFT JOIN medibridge.test_parameters tp ON t.test_id = tp.test_id
            LEFT JOIN medibridge.parameters p ON tp.parameter_code = p.parameter_code
            GROUP BY t.test_id
            ORDER BY t.test_id ASC;


            `, { type: QueryTypes.SELECT });
        const allSamples = await getAllSamples(forceFetch);
        // ✅ map over the result and rename the property
        const mappedTests = allTests.map((test) => {
            const { test_id, name, slug, base_price, crelio_id, dept_code, tat, sample_id, model_image, icon, description, fasting_required, created_at, updated_at, parameters, parameter_info } = test;
            const sampleDetails = allSamples.find((sample) => sample.sampleId === sample_id);
            const parameterInfoWithFallback = (parameter_info && parameter_info.length > 0)
                ? parameter_info.map((p) => ({
                    name: p.name,
                    parameterCode: p.parameter_code ?? null, // normalize key
                }))
                : [{
                        name: name, // fallback to test name
                        parameterCode: null, // fallback null
                    }];
            const toCache = {
                testId: test_id,
                name: name,
                slug: slug,
                basePrice: base_price,
                crelioId: crelio_id,
                departmentCode: dept_code,
                tat: tat,
                sampleId: sample_id,
                sampleInfo: sampleDetails,
                modelImage: model_image,
                icon: icon,
                description: description,
                fastingRequired: fasting_required,
                parameters: parameters || [],
                createdAt: created_at,
                updatedAt: updated_at,
                parameterInfo: parameterInfoWithFallback || [],
            };
            return toCache;
        });
        UnifiedCache.setData("allTests", mappedTests);
        return mappedTests;
    }
    catch (error) {
        console.error("❌ Error fetching tests:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allTests", false);
    }
}
//SubPackages Cache
export async function getAllSubPackages(forceFetch = false) {
    let allSubPackages = await UnifiedCache.getData("allSubPackages");
    if (allSubPackages && !forceFetch) {
        console.log("🗂️  Using cached sub-packages data");
        return allSubPackages;
    }
    UnifiedCache.setFetchingStatus("allSubPackages", true);
    try {
        const allTests = await getAllTests(forceFetch);
        const allSubPackages = await sequelize.query(`
            SELECT
                s.*,
                COALESCE(ARRAY_AGG(st.test_id) FILTER (WHERE st.test_id IS NOT NULL), '{}') AS test_ids
            FROM medibridge.sub_packages s
            LEFT JOIN medibridge.sub_package_tests st ON st.sub_package_id = s.sub_package_id
            GROUP BY s.sub_package_id
            ORDER BY s.sub_package_id ASC;
            `, { type: QueryTypes.SELECT });
        // ✅ map over the result and rename the property
        const mappedSubPackages = allSubPackages.map((subPkg) => {
            const { test_ids, ...rest } = subPkg;
            let allTestPackages = {};
            let parameterCount = 0;
            let parameters = [];
            let total_package_price = 0;
            let sampleTypes = [];
            for (let testId of test_ids || []) {
                const testDetails = allTests.find((t) => t.testId === testId);
                if (testDetails) {
                    const sampleInfo = testDetails.sampleInfo;
                    sampleInfo ? sampleTypes.push(sampleInfo) : null;
                    total_package_price += testDetails.basePrice || 0;
                    allTestPackages = {
                        ...allTestPackages, [testId]: {
                            name: testDetails.name,
                            slug: testDetails.slug,
                            parameters: testDetails.parameterInfo
                        }
                    };
                    parameterCount += (testDetails.parameterInfo?.length || 0);
                }
            }
            const toCache = {
                subPackageId: rest.sub_package_id,
                packageId: rest.package_id,
                name: rest.name,
                slug: rest.slug,
                title: rest.title,
                crelioId: rest.crelio_id,
                basePrice: total_package_price,
                price: rest.price,
                tat: rest.tat,
                description: rest.description,
                icon: rest.icon,
                modelImage: rest.model_image,
                testIds: test_ids || [],
                testInfo: allTestPackages,
                totalParameters: parameterCount,
                samples: Array.from(new Set(sampleTypes)),
            };
            return toCache;
        });
        UnifiedCache.setData("allSubPackages", mappedSubPackages);
        return mappedSubPackages;
    }
    catch (error) {
        console.error("❌ Error fetching sub-packages:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allSubPackages", false);
    }
}
// Packages Cache
export async function getAllPackages(forceFetch = false) {
    let allPackages = await UnifiedCache.getData("allPackages");
    if (allPackages && !forceFetch) {
        console.log("🗂️  Using cached packages data");
        return allPackages;
    }
    UnifiedCache.setFetchingStatus("allPackages", true);
    try {
        const allSubPackages = await getAllSubPackages(forceFetch);
        const allPackages = await sequelize.query(`
            SELECT
                p.*
            FROM medibridge.packages p
            ORDER BY p.name ASC
            `, { type: QueryTypes.SELECT });
        let toCache = [];
        allPackages.forEach((pkg) => {
            const { package_id, name, title, slug, description, icon, model_image } = pkg;
            const subPackages = allSubPackages.filter((sp) => sp.packageId === package_id);
            let existingPackage = toCache.find(p => p.packageId === package_id);
            if (!existingPackage) {
                existingPackage = {
                    packageId: package_id,
                    name: name,
                    slug: slug,
                    title: title,
                    description: description,
                    icon: icon,
                    modelImage: model_image,
                    subPackages: subPackages,
                };
                toCache.push(existingPackage);
            }
        });
        UnifiedCache.setData("allPackages", toCache);
        return toCache;
    }
    catch (error) {
        console.error("❌ Error fetching packages:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allPackages", false);
    }
}
// Homepage banner
export async function getAllBanners(forceFetch = false) {
    let allBanners = await UnifiedCache.getData("allBanners");
    if (allBanners && !forceFetch) {
        console.log("🗂️  Using cached banners data");
        return allBanners;
    }
    UnifiedCache.setFetchingStatus("allBanners", true);
    try {
        const allBanners = await sequelize.query(`
            SELECT
                *
            FROM medibridge.home_banners
            ORDER BY banner_id ASC
            `, { type: QueryTypes.SELECT });
        // ✅ map over the result and rename the property
        const mappedBanners = allBanners.map((banner) => {
            const { banner_id, redirect_url, phone_image, desktop_image, description, title } = banner;
            const toCache = {
                bannerId: banner_id,
                phoneImage: phone_image,
                desktopImage: desktop_image,
                title: title,
                description: description,
                redirectUrl: redirect_url,
            };
            return toCache;
        });
        UnifiedCache.setData("allBanners", mappedBanners);
        return mappedBanners;
    }
    catch (error) {
        console.error("❌ Error fetching banners:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allBanners", false);
    }
}
// Popular Tests Cache
export async function getPopularTests(forceFetch = false) {
    let popularTests = await UnifiedCache.getData("popularTests");
    if (popularTests && !forceFetch) {
        console.log("🗂️  Using cached popular tests data");
        return popularTests;
    }
    UnifiedCache.setFetchingStatus("popularTests", true);
    try {
        const popularTests = await sequelize.query(`
            SELECT
                pt.id AS position,
                pt.test_id
            FROM medibridge.popular_test pt
            `, { type: QueryTypes.SELECT });
        if (!popularTests) {
            return [];
        }
        const allTests = await getAllTests(forceFetch);
        const mappedPopularTests = popularTests.reduce((acc, test) => {
            const { position, test_id } = test;
            const testDetails = allTests.find((t) => t.testId === test_id);
            if (testDetails) {
                acc[position] = testDetails;
            }
            const { name, slug, basePrice, crelioId, departmentCode, tat, sampleId, sampleInfo, modelImage, icon, description, fastingRequired, parameters, parameterInfo, createdAt, updatedAt, } = testDetails;
            acc[position] = {
                testId: test_id,
                name: name,
                slug: slug,
                basePrice: basePrice,
                crelioId: crelioId,
                departmentCode: departmentCode,
                tat: tat,
                sampleId: sampleId,
                sampleInfo: sampleInfo || null,
                modelImage: modelImage,
                icon: icon,
                description: description,
                fastingRequired: fastingRequired,
                parameters: parameters || [],
                parameterInfo: parameterInfo || [],
                createdAt: createdAt,
                updatedAt: updatedAt,
            };
            return acc;
        }, {});
        UnifiedCache.setData("popularTests", mappedPopularTests);
        return mappedPopularTests;
    }
    catch (error) {
        console.error("❌ Error fetching popular tests:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("popularTests", false);
    }
}
// Popular Packages Cache
export async function getPopularPackages(forceFetch = false) {
    let popularPackages = await UnifiedCache.getData("popularPackages");
    if (popularPackages && !forceFetch) {
        console.log("🗂️  Using cached popular tests data");
        return popularPackages;
    }
    UnifiedCache.setFetchingStatus("popularPackages", true);
    try {
        const popularPackages = await sequelize.query(`
            SELECT
                pp.id AS position,
                pp.sub_pkg_id

            FROM medibridge.popular_package pp
            ORDER BY pp.id ASC
            `, { type: QueryTypes.SELECT });
        if (!popularPackages) {
            return [];
        }
        const allPackages = await getAllPackages();
        const mappedPopularPackages = popularPackages.reduce((acc, pkg) => {
            const { position, sub_pkg_id } = pkg;
            const packageData = allPackages.flatMap(p => p.subPackages || []).find(sp => sp.subPackageId === sub_pkg_id);
            acc[position] = packageData;
            return acc;
        }, {});
        UnifiedCache.setData("popularPackages", mappedPopularPackages);
        return mappedPopularPackages;
    }
    catch (error) {
        console.error("❌ Error fetching popular packages:", error);
        return [];
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("popularPackages", false);
    }
}
// All Collection Centers
export async function getAllCollectionCenter(forceFetch = false) {
    let allCC = await UnifiedCache.getData("allCollectionCenters");
    if (allCC && !forceFetch) {
        console.log("🗂️  Using cached collection center data");
        return allCC;
    }
    UnifiedCache.setFetchingStatus("allCollectionCenters", true);
    try {
        const allCC = await sequelize.query(`
            SELECT
                *
            FROM medibridge.collection_centers
            ORDER BY id DESC
            `, { type: QueryTypes.SELECT });
        if (!allCC) {
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
        UnifiedCache.setData("allCollectionCenters", mappedCC);
        return mappedCC;
    }
    catch (error) {
        console.error("❌ Error fetching collection centers:", error);
        return false;
    }
    finally {
        // ✅ clear the promise so new fetches can start
        UnifiedCache.setFetchingStatus("allCollectionCenters", false);
    }
}
// console.log(await getAllSubPackages())
