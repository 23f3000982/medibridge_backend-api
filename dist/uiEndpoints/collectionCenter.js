import express from "express";
import { getAllCollectionCenter } from "../utils/cache/cache.js";
const collectionCenterRouter = express.Router();
collectionCenterRouter.use(async (req, res) => {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }
    let allCC;
    try {
        allCC = await getAllCollectionCenter();
    }
    catch (e) {
        console.error("Error fetching collection center data:", e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
    if (!allCC) {
        return res.status(404).json({ message: "No collection center data found" });
    }
    return res.status(200).json({ success: true, data: allCC });
});
export default collectionCenterRouter;
