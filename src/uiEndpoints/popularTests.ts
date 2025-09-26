import express from "express";
import { getPopularTests } from "../utils/cache/cache.js";
import { Test } from "../constantTypes.js";
import { toSendableTest } from "./tests.js";


const popularTestRouter = express.Router();

popularTestRouter.use(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const toSend = await popularTests();
    return res.status(200).json(toSend);
})



export default popularTestRouter;

export const popularTests = async (): Promise<any[]> => {
    const popularTests: { [key: string]: Test } = await getPopularTests();
    const allPopularTestInfo = await Object.keys(popularTests)
        .sort()
        .map(key => {
            const test = popularTests[key];
            return toSendableTest(test);
        });
    return allPopularTestInfo
};