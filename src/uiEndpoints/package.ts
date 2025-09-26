import express from "express";
import { getAllSubPackages } from "../utils/cache/cache.js";
import { SubPackage } from "../constantTypes";

const packageRouter = express.Router();

packageRouter.use('/', async (req, res) => {
    // console.log("Received request body:", req.body);
    if (req.method !== 'POST' || !req.body) {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { slug, pageId, limit, sortBy } = req.body;

    if (!slug && !pageId) {
        return res.status(400).json({ error: "Missing required parameters" });
    }
    const allPqackages = await getAllSubPackages();

    if (slug) {
        const packageData = allPqackages.find((pkg: SubPackage) => pkg.slug === slug);
        // console.log("Package data found:", packageData);
        if (!packageData) {
            return res.status(404).json({ error: "Package not found" });
        }
        const toSend = toSendableSubPackage(packageData);
        return res.json(toSend);

    } else if (pageId) {
        const page = parseInt(pageId, 10) || 1;
        const itemsPerPage = parseInt(limit, 10) || 20;
        const sortedPackages = [...allPqackages];

        if (sortBy === 'name') {
            sortedPackages.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'date') {
            sortedPackages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        const startIndex = (page - 1) * itemsPerPage;
        const paginatedPackages = sortedPackages.slice(startIndex, startIndex + itemsPerPage);

        const toSend = paginatedPackages.map(pkg => toSendableSubPackage(pkg));

        return res.json({
            packages: toSend,
            currentPage: page,
            totalPages: Math.ceil(allPqackages.length / itemsPerPage),
        });
    }

    return res.status(400).json({ error: "Invalid request" });


});
export default packageRouter;



export function toSendableSubPackage(pkg: SubPackage) {
    // console.log("Converting package:", pkg);
    const {
        subPackageId, packageId,
        name, slug, title, crelioId, basePrice, price, tat, description,
        icon, modelImage,
        testIds, testInfo,
        totalParameters,
        samples
    } = pkg;

    const allTests = Object.entries(testInfo)
        .map(([id, data]) => (data));

    return {
        type: 'subPackage',
        name: name,
        slug: slug,
        basePrice: basePrice,
        discountPrice: price,
        tat: tat,
        icon: icon,
        modelImage: modelImage,
        description: description,
        totalTests: testInfo.length,
        tests: allTests,
        samples: samples,
        parameterCount: totalParameters
    }


}