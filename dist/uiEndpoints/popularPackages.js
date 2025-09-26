import express from 'express';
import { getPopularPackages } from '../utils/cache/cache.js';
import { toSendableSubPackage } from './package.js';
const PopularPackagesRouter = express.Router();
PopularPackagesRouter.use(async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const toSend = await popularSubPackages();
    res.json(toSend);
});
export default PopularPackagesRouter;
export const popularSubPackages = async () => {
    const allPopularPackages = await getPopularPackages();
    const PopularPackagesInfo = await Object.keys(allPopularPackages)
        .sort()
        .map(key => {
        const pkg = allPopularPackages[key]; // Get the package using the key
        const allTests = Object.values(pkg.testInfo);
        const parameterCount = pkg.totalParameters;
        // console.log("Popular Package:", pkg);
        return toSendableSubPackage(pkg);
    });
    return PopularPackagesInfo;
};
