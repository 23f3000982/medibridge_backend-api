
import express from 'express';
import { sequelize } from '../utils/postgress/postgress.js';
import { QueryTypes } from 'sequelize';
import { getAllTests } from '../utils/cache/cache.js';
import { Test } from '../constantTypes.js';

const testRouter = express.Router();

// Handle GET /test route
testRouter.use('/', async (req, res) => {
    console.log("Received request body:", req.body);
    if (req.method !== 'POST' || !req.body) {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { slug, pageId, limit, sortBy } = req.body;

    if (!slug && !pageId) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const allTests = await getAllTests();

    // If testSlug is provided, fetch specific test details
    if (slug) {
        const specificTest: Test = allTests.find((test: Test) => test.slug === slug);
        if (specificTest) {
            const toSend = toSendableTest(specificTest);
            return res.status(200).json(toSend);
        }
    } else {
        let defaultLimit = limit || 50;
        const startIndex = (pageId - 1) * defaultLimit;
        const endIndex = startIndex + defaultLimit;

        let sortedTests = [...allTests];
        if (sortBy === 'priceAsc') {
            sortedTests.sort((a, b) => a.basePrice - b.basePrice);
        } else if (sortBy === 'priceDesc') {
            sortedTests.sort((a, b) => b.basePrice - a.basePrice);
        } else if (sortBy === 'tatAsc') {
            sortedTests.sort((a, b) => a.tat - b.tat);
        } else if (sortBy === 'tatDesc') {
            sortedTests.sort((a, b) => b.tat - a.tat);
        }

        const paginatedTests = sortedTests.slice(startIndex, endIndex);
        const toSend = paginatedTests.map(test => toSendableTest(test));
        return res.status(200).json({
            tests: toSend,
            currentPage: pageId,
            totalPages: Math.ceil(allTests.length / defaultLimit),
        });


    }

    // try {
    //     if (!slug) {
    //         const allDbTest = await sequelize.query(
    //             `SELECT * FROM tests`,
    //             { type: QueryTypes.SELECT }
    //         );
    //         allTests.push(...allDbTest);
    //     } else {
    //         const dbTest = await sequelize.query(
    //             `
    //             SELECT
    //                 s.name AS sample_name,
    //                 t.*
    //             FROM tests t 
    //             LEFT JOIN samples s ON t.sample_id = s.id
    //             WHERE slug = :testId
    //             `,
    //             {
    //                 replacements: { testId },
    //                 type: QueryTypes.SELECT
    //             }
    //         );
    //         if (dbTest.length === 0) {
    //             return res.status(404).json({ error: "Test not found" });
    //         }
    //         allTests.push(...dbTest);
    //     }

    //     res.status(200).json(allTests);
    // } catch (err) {
    //     console.error(err);
    //     res.status(500).json({ error: "Server error" });
    // }
});



export default testRouter;



export function toSendableTest(test: Test) {
    const { testId, name, slug,
        basePrice, crelioId,
        departmentCode, tat, sampleId,
        sampleInfo, modelImage, icon,
        description, fastingRequired, parameters,
        createdAt, updatedAt, parameterInfo
    } = test;


    const paramInfo = parameterInfo.map(param => (param.name));

    return {
        name: name,
        slug: slug,
        price: basePrice,
        discountedPrice: basePrice,
        tat: tat,
        icon: icon,
        modelImage: modelImage,
        description: description,
        fastingRequired: fastingRequired,
        sample: sampleInfo,
        parameters: paramInfo,
        parameterCount: parameterInfo.length
    }


}