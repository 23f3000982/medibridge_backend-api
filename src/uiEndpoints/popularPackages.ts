import express from 'express';
import { getAllTests, getPopularPackages } from '../utils/cache/cache.js';
import { SubPackage } from '../constantTypes.js';

const PopularPackagesRouter = express.Router();

PopularPackagesRouter.use(async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const allPopularPackages = await getPopularPackages();
    // const alllTests = await getAllTests();
    // console.dir(alllTests.slice(0, 20), { depth: null });

    const PopularPackagesInfo = await Object.keys(allPopularPackages)
        .sort()
        .map(key => {
            const pkg: SubPackage = allPopularPackages[key]; // Get the package using the key
            const allTests = Object.values(pkg.testInfo)
            const ParamterCount = pkg.totalParameters

            console.log("Popular Package:", pkg);
            return {
                name: pkg.name,
                slug: `${pkg.slug}`,
                title: pkg.title,
                basePrice: pkg.basePrice,
                price: pkg.price,
                tat: pkg.tat,
                description: pkg.description,
                icon: pkg.icon,
                modelImage: pkg.modelImage,
                totalTests: pkg.testInfo.length,
                totalParameters: ParamterCount,
                samples: pkg.samples,
                tests: allTests,
            };
        });


    res.status(200).send(PopularPackagesInfo);
});

export default PopularPackagesRouter;