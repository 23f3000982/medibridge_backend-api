import express from "express";
import { getPopularTests } from "../utils/cache/cache.js";
import { Test } from "../constantTypes.js";


const popularTestRouter = express.Router();

popularTestRouter.use(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const popularTests: { [key: string]: Test } = await getPopularTests();
    const allPopularTestInfo = await Object.keys(popularTests)
        .sort()
        .map(key => {
            const test = popularTests[key];
            return {
                name: test.name,
                slug: `${test.slug}`,
                price: test.basePrice + 100,
                discountPrice: test.basePrice,
                tat: test.tat,
                icon: test.icon,
                modelImage: test.modelImage,
                description: test.description,
                fastingRequired: test.fastingRequired,
                parameterCount: test.parameterInfo ? test.parameterInfo.length : 1
            };
        });

    res.status(200).json(allPopularTestInfo);
})



export default popularTestRouter;