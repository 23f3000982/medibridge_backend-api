import express from 'express';
import { getAllBanners, getAllImages } from '../utils/cache/cache';
import { HomeBanner, Image } from '../constantTypes';


const homeBannerRouter = express.Router();


homeBannerRouter.use(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const homeBanner: HomeBanner[] = await getAllBanners();
    const allImages: Image[] = await getAllImages();

    const toSend = await homeBanner.map((banner: HomeBanner) => {
        const { bannerId, phoneImage, desktopImage, title, description, redirectUrl } = banner
        const phoneImg = allImages.find((img) => img.link === phoneImage);
        const desktopImg = allImages.find((img) => img.link === desktopImage);
        return {
            title: title || "",
            phoneImage: phoneImage || "",
            desktopImage: desktopImage || "",
            phoneBlurHash: phoneImg?.blurHash || "",
            desktopBlurHash: desktopImg?.blurHash || "",
            redirectUrl: redirectUrl || "",
        }
    });
    res.status(200).json(toSend);
})



export default homeBannerRouter;