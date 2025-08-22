import express from 'express';
import { sequelize } from '../utils/postgress/postgress.js';

const departmentRouter = express.Router();

// GET /department - Fetch all departments
departmentRouter.get('/', async (req, res) => {
    try {
        const allDepartments = await sequelize.query(
            `SELECT * FROM departments`,
            { type: sequelize.QueryTypes.SELECT }
        );
        return res.status(200).json(allDepartments);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});



export default departmentRouter;
