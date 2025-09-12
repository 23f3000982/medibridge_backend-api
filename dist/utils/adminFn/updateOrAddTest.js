import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";
export async function updateTest(testData) {
    console.log("updateOrAddTest called with:", testData);
    const { testId, name, slug, basePrice, crelioId, departmentCode, tat, sampleId, modelImage, icon, description, fastingRequired, parameters } = testData;
    const isNew = !testId;
    if (!name || !slug || !crelioId || !departmentCode || !tat || !sampleId || !basePrice) {
        return { success: false, message: "Missing required fields" };
    }
    const testTx = await sequelize.transaction();
    let commited = false;
    try {
        if (isNew) {
            const [checkAlreadyExists] = await sequelize.query(`SELECT * FROM medibridge.test
                WHERE
                    crelio_id = :crelioId OR
                    slug = :slug
                `, {
                replacements: { crelioId, slug },
                type: QueryTypes.SELECT,
                transaction: testTx
            });
            if (checkAlreadyExists) {
                return { success: false, message: "Test with the same Crelio ID or slug already exists" };
            }
            const [newTest] = await sequelize.query(`INSERT INTO medibridge.test
                (
                    name,
                    base_price,
                    crelio_id,
                    dept_code,
                    tat,
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
                    :tat,
                    :sampleId,
                    :slug,
                    :modelImage,
                    :icon,
                    :description,
                    :fastingRequired
                )
                RETURNING *`, {
                replacements: {
                    name,
                    basePrice,
                    crelioId,
                    departmentCode: departmentCode,
                    tat,
                    sampleId,
                    slug,
                    modelImage: modelImage || null,
                    icon: icon || null,
                    description: description || null,
                    fastingRequired: fastingRequired || false
                },
                type: QueryTypes.INSERT,
                transaction: testTx
            });
            // insert into parameters
            const newTestId = newTest[0].test_id;
            for (const paramCode of parameters) {
                await sequelize.query(`INSERT INTO medibridge.test_parameters (test_id, parameter_code) 
                    VALUES (:testId, :paramCode)`, {
                    replacements: { testId: newTestId, paramCode },
                    type: QueryTypes.INSERT,
                    transaction: testTx
                });
            }
            await testTx.commit();
            commited = true;
            return { success: true, message: "Test added successfully" };
        }
        else {
            const [existingTest] = await sequelize.query(`SELECT * FROM medibridge.test
                WHERE test_id = :testId`, {
                replacements: { testId },
                type: QueryTypes.SELECT,
                transaction: testTx
            });
            if (!existingTest) {
                return { success: false, message: "Test not found" };
            }
            const [checkAlreadyExists] = await sequelize.query(`SELECT * FROM medibridge.test
                WHERE (crelio_id = :crelioId OR slug = :slug) AND test_id != :testId`, {
                replacements: { crelioId, slug, testId },
                type: QueryTypes.SELECT,
                transaction: testTx
            });
            if (checkAlreadyExists) {
                return { success: false, message: "Another test with the same Crelio ID or slug already exists" };
            }
            await sequelize.query(`UPDATE medibridge.test
                SET 
                    name = :name,
                    base_price = :basePrice,
                    crelio_id = :crelioId,
                    dept_code = :departmentCode,
                    tat = :tat,
                    sample_id = :sampleId,
                    slug = :slug,
                    model_image = :modelImage,
                    icon = :icon,
                    description = :description,
                    fasting_required = :fastingRequired,
                    updated_at = NOW()
                WHERE test_id = :testId`, {
                replacements: {
                    testId,
                    name,
                    basePrice,
                    crelioId,
                    departmentCode: departmentCode,
                    tat,
                    sampleId,
                    slug,
                    modelImage: modelImage || null,
                    icon: icon || null,
                    description: description || null,
                    fastingRequired: fastingRequired || false
                },
                type: QueryTypes.UPDATE,
                transaction: testTx
            });
            // update parameters: delete old and insert new
            await sequelize.query(`DELETE FROM medibridge.test_parameters
                WHERE test_id = :testId`, {
                replacements: { testId },
                type: QueryTypes.DELETE,
                transaction: testTx
            });
            for (const paramCode of parameters) {
                await sequelize.query(`INSERT INTO medibridge.test_parameters (test_id, parameter_code) 
                    VALUES (:testId, :paramCode)`, {
                    replacements: { testId, paramCode },
                    type: QueryTypes.INSERT,
                    transaction: testTx
                });
            }
            await testTx.commit();
            commited = true;
            return { success: true, message: "Test updated successfully" };
        }
    }
    catch (error) {
        console.error("Error in updateOrAddTest:", error, testData);
        return { success: false, message: "Server error" };
    }
    finally {
        if (!commited) {
            await testTx.rollback();
        }
    }
}
export async function deleteTest(data) {
    const { testId } = data;
    if (!testId) {
        return { success: false, message: "Missing required fields" };
    }
    const deletionTx = await sequelize.transaction();
    let commited = false;
    try {
        const [existingTest] = await sequelize.query(`SELECT * FROM medibridge.test
            WHERE test_id = :testId`, {
            replacements: { testId },
            type: QueryTypes.SELECT,
            transaction: deletionTx
        });
        if (!existingTest) {
            return { success: false, message: "Test not found" };
        }
        await sequelize.query(`DELETE FROM medibridge.test
            WHERE test_id = :testId`, {
            replacements: { testId },
            type: QueryTypes.DELETE,
            transaction: deletionTx
        });
        await deletionTx.commit();
        commited = true;
        return { success: true, message: "Test deleted successfully" };
    }
    catch (error) {
        console.error("Error in deleteTest:", error, data);
        return { success: false, message: "Server error" };
    }
    finally {
        if (!commited) {
            await deletionTx.rollback();
        }
    }
}
