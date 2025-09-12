import express from 'express';
import { sequelize } from '../utils/postgress/postgress.js';
import { QueryTypes } from 'sequelize';

const testRouter = express.Router();

// Handle GET /test route
testRouter.use('/', async (req, res) => {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { testId } = req.body;
    const allTests = [];
    try {
        if (!testId) {
            const allDbTest = await sequelize.query(
                `SELECT * FROM tests`,
                { type: QueryTypes.SELECT }
            );
            allTests.push(...allDbTest);
        } else {
            const dbTest = await sequelize.query(
                `
                SELECT
                    s.name AS sample_name,
                    t.*
                FROM tests t 
                LEFT JOIN samples s ON t.sample_id = s.id
                WHERE slug = :testId
                `,
                {
                    replacements: { testId },
                    type: QueryTypes.SELECT
                }
            );
            if (dbTest.length === 0) {
                return res.status(404).json({ error: "Test not found" });
            }
            allTests.push(...dbTest);
        }

        res.status(200).json(allTests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ GET /test/popular route: join popular_tests -> tests using test_code
testRouter.get('/popular', async (req, res) => {
    try {
        const popularTests = await sequelize.query(
            `
            SELECT t.*
            FROM popular_tests p
            JOIN tests t ON p.test_code = t.test_code
            `,
            { type: QueryTypes.SELECT }
        );

        res.status(200).json(popularTests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch popular tests" });
    }
});


export default testRouter;
