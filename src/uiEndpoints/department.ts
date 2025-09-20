import express from 'express';
import { sequelize } from '../utils/postgress/postgress.js';
import { QueryTypes } from 'sequelize';
import { getAllDepartments } from '../utils/cache/cache.js';
import { Department } from '../constantTypes.js';

const departmentRouter = express.Router();

// GET /department - Fetch all departments
departmentRouter.use(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const allDepartments = await getAllDepartments();


    const toSend = allDepartments.map((dept: Department) => {
        const { departmentId, deptCode, name, image, imageHash, description, totalTests } = dept;
        return {
            name,
            departmentCode: deptCode,
            image,
            imageBlurHash: imageHash,
            description,
            totalTests,
        }
    });

    res.json(toSend);
});



export default departmentRouter;
