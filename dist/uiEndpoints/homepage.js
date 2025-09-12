import express from 'express';
const homeBannerRouter = express.Router();
homeBannerRouter.use((req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    res.status(200).json({ message: "Welcome to the API" });
});
// homepageRouter.get('/banner', async (req, res) => {
//     try {
//         const homepageData = await sequelize.query(
//             `SELECT * FROM homepage_banner`,
//             { type: sequelize.QueryTypes.SELECT }
//         );
//         return res.status(200).json(homepageData);
//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ error: "Server error" });
//     }
// });
export default homeBannerRouter;
