import express from 'express';
import { sequelize } from '../utils/postgress/postgress.js';
import { QueryTypes } from 'sequelize';

const packageRouter = express.Router();

// GET all packages or packages by department
packageRouter.get('/', async (req, res) => {
    const { packageid } = req.body;
    const allPackages = [];
    try {
        if (!packageid) {
            const allDbPackage = await sequelize.query(
                `SELECT * FROM packages`,
                { type: QueryTypes.SELECT }
            );
            allPackages.push(...allDbPackage);
        } else {
            const dbPackage = await sequelize.query(
                `
                SELECT
                    d.name AS department_name,
                    p.*
                FROM packages p
                LEFT JOIN department d ON p.department_id = d.id
                WHERE d.id = :packageid
                `,
                {
                    replacements: { packageid },
                    type: QueryTypes.SELECT
                }
            );
            if (dbPackage.length === 0) {
                return res.status(404).json({ error: "Package not found" });
            }
            allPackages.push(...dbPackage);
        }

        res.status(200).json(allPackages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET popular packages
packageRouter.get('/popular', async (req, res) => {
    try {
        const popularPackages = await sequelize.query(
            `
            SELECT p.*
            FROM popular_package pp
            INNER JOIN packages p ON pp.package_code = p.package_code
            `,
            { type: QueryTypes.SELECT }
        );

        res.status(200).json(popularPackages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch popular packages" });
    }
});

// GET package details by slug
packageRouter.get('/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const packageDetails = await sequelize.query(
            `
          SELECT 
    p.id,
    p.name,
    p.package_code,
    p.slug,
    p.price,
    p.tat,
    JSON_AGG(
        json_build_object(
            'test_code', t.test_code,
            'test_name', t.name,
            'price', t.price,
            'tat', t.tat,
            'sample', json_build_object(
                'sample_id', s.id,
                'sample_name', s.name
            ),
            'parameters', (
                SELECT JSON_AGG(
                    json_build_object(
                        'parameter_code', pm.parameter_code,
                        'parameter_name', COALESCE(pm.name, t.name)
                    )
                )
                FROM test_parameter tp
                JOIN parameters pm ON tp.parameter_code = pm.parameter_code
                WHERE tp.test_code = t.test_code
            )
        )
    ) AS tests
  FROM packages p
  LEFT JOIN package_tests pt ON p.package_code = pt.package_code
  LEFT JOIN tests t ON pt.test_code = t.test_code
  LEFT JOIN samples s ON t.sample_id = s.id
  WHERE p.slug = :slug
  GROUP BY 
    p.id,
    p.name,
    p.package_code,
    p.slug,
    p.price;


            `,
            {
                replacements: { slug },
                type: QueryTypes.SELECT
            }
        );

        if (packageDetails.length === 0) {
            return res.status(404).json({ error: "Package not found" });
        }

        res.status(200).json(packageDetails[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

export default packageRouter;
