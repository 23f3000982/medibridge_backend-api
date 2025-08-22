import express from 'express';
import { sequelize } from '../utils/postgress/postgress.js';


const homepageRouter = express.Router();


homepageRouter.get('/banner', async (req, res) => {
    try {
        const homepageData = await sequelize.query(
            `SELECT * FROM homepage_banner`,
            { type: sequelize.QueryTypes.SELECT }
        );
        return res.status(200).json(homepageData);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});

export default homepageRouter;