import express from "express";
import { getAllDepartments, getAllSamples, getPopularTests } from "../utils/cache/cache.js";
import { Department, SampleType, Test } from "../constantTypes.js";


const popularTestRouter = express.Router();

popularTestRouter.use(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const popularTests: { [key: string]: Test } = await getPopularTests();
    const allSamples = await getAllSamples();
    const allDepartments = await getAllDepartments();
    const allPopularTestInfo = await Object.keys(popularTests)
        .sort()
        .map(key => {
            const test = popularTests[key]; // Get the test using the key
            return {
                name: test.name,
                slug: `${test.slug}`,
                price: test.basePrice,
                discountPrice: test.basePrice,
                tat: test.tat,
                icon: test.icon,
                modelImage: test.modelImage,
                description: test.description,
                fastingRequired: test.fastingRequired,
                parameterCount: test.parameters ? test.parameters.length : 0
            };
        });

    res.status(200).json(allPopularTestInfo);
})



export default popularTestRouter;