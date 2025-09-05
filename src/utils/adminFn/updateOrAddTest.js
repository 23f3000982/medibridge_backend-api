import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

export async function updateOrAddTest(testData) {
    const { testId, name, slug, crelioId, departmentId, tatMinutes, sampleId, parameters, icon, modelImage, description, fastingRequired, basePrice } = testData;

    const isNew = testId ? false : true;
    if (!name || !slug || !crelioId || !departmentId || !tatMinutes || !sampleId || !basePrice) {
        return { success: false, message: "Missing required fields" };
    }

    const testTx = await sequelize.transaction();
    let commited = false;
    try {
        if (isNew) {
            const [checkAlreadyExists] = await sequelize.query(
                `SELECT * FROM medibridge.test
                WHERE crelio_id = :crelioId OR slug = :slug`,
                {
                    replacements: { crelioId, slug },
                    type: QueryTypes.SELECT,
                    transaction: testTx
                }
            );
            if (checkAlreadyExists) {
                return { success: false, message: "Test with the same Crelio ID or slug already exists" };
            }

            const [departmentDetail] = await sequelize.query(
                `SELECT * FROM medibridge.departments 
                WHERE id = :departmentId`,
                {
                    replacements: { departmentId },
                    type: QueryTypes.SELECT,
                    transaction: testTx
                }
            );
            if (!departmentDetail) {
                return { success: false, message: "Department not found" };
            }

            const { id, name: deptName, code: deptCode } = departmentDetail;
            const [newTest] = await sequelize.query(
                `INSERT INTO medibridge.test
                (
                    name,
                    base_price,
                    crelio_id,
                    department,
                    tat_minutes,
                    sample_id,
                    slug,
                    model_image,
                    icon,
                    description,
                    fasting_required
                    )
                VALUES 
                (
                    :name,
                    :basePrice,
                    :crelioId,
                    :departmentCode,
                    :tatMinutes,
                    :sampleId,
                    :slug,
                    :modelImage,
                    :icon,
                    :description,
                    :fastingRequired
                )
                RETURNING *`,
                {
                    replacements: {
                        name,
                        basePrice,
                        crelioId,
                        departmentCode: deptCode,
                        tatMinutes,
                        sampleId,
                        slug,
                        modelImage: modelImage || null,
                        icon: icon || null,
                        description: description || null,
                        fastingRequired: fastingRequired || false
                    },
                    type: QueryTypes.INSERT,
                    transaction: testTx
                }
            );

            // insert into parameters
            for (const paramCode of parameters) {
                await sequelize.query(
                    `INSERT INTO medibridge.test_parameters (test_id, parameter) 
                    VALUES (:testId, :paramCode)`,
                    {
                        replacements: { testId: newTest[0].id, paramCode },
                        type: QueryTypes.INSERT,
                        transaction: testTx
                    }
                );
            }

            await testTx.commit();
            commited = true;
            return { success: true, message: "Test added successfully" };
        }

    } catch (error) {
        console.error("Error in updateOrAddTest:", error, testData);
        return { success: false, message: "Server error" };
    } finally {
        if (!commited) {
            await testTx.rollback();
        }
    }


}