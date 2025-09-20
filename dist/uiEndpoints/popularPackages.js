import express from 'express';
import { getPopularPackages } from '../utils/cache/cache.js';
const PopularPackagesRouter = express.Router();
PopularPackagesRouter.use(async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const allPopularPackages = await getPopularPackages();
    const PopularPackagesInfo = await Object.keys(allPopularPackages)
        .sort()
        .map(key => {
        const pkg = allPopularPackages[key]; // Get the package using the key
        const allTests = Object.values(pkg.testInfo);
        const parameterCount = pkg.totalParameters;
        // console.log("Popular Package:", pkg);
        return {
            name: pkg.name,
            slug: `${pkg.slug}`,
            title: pkg.title,
            basePrice: pkg.basePrice,
            discountPrice: pkg.price,
            tat: pkg.tat,
            description: pkg.description,
            icon: pkg.icon,
            modelImage: pkg.modelImage,
            totalTests: pkg.testInfo.length,
            parameterCount: parameterCount,
            samples: pkg.samples,
            tests: allTests,
        };
    });
    res.status(200).send(PopularPackagesInfo);
});
export default PopularPackagesRouter;
