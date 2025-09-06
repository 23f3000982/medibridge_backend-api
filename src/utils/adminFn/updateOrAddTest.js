import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

export async function updateOrAddTest(testData) {
    const { id, name, slug, crelioId, department, tatMinutes, sampleId, parameters, icon, modelImage, description, fastingRequired, basePrice } = testData;

    const isNew = id ? false : true;
    if (!name || !slug || !crelioId || !department || !tatMinutes || !sampleId || !basePrice) {
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
                        departmentCode: department,
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
        } else {
            const [existingTest] = await sequelize.query(
                `SELECT * FROM medibridge.test
                WHERE id = :id`,
                {
                    replacements: { id },
                    type: QueryTypes.SELECT,
                    transaction: testTx
                }
            );
            if (!existingTest) {
                return { success: false, message: "Test not found" };
            }

            const [checkAlreadyExists] = await sequelize.query(
                `SELECT * FROM medibridge.test
                WHERE (crelio_id = :crelioId OR slug = :slug) AND id != :id`,
                {
                    replacements: { crelioId, slug, id },
                    type: QueryTypes.SELECT,
                    transaction: testTx
                }
            );
            if (checkAlreadyExists) {
                return { success: false, message: "Another test with the same Crelio ID or slug already exists" };
            }

            await sequelize.query(
                `UPDATE medibridge.test
                SET 
                    name = :name,
                    base_price = :basePrice,
                    crelio_id = :crelioId,
                    department = :departmentCode,
                    tat_minutes = :tatMinutes,
                    sample_id = :sampleId,
                    slug = :slug,
                    model_image = :modelImage,
                    icon = :icon,
                    description = :description,
                    fasting_required = :fastingRequired
                WHERE id = :id`,
                {
                    replacements: {
                        id,
                        name,
                        basePrice,
                        crelioId,
                        departmentCode: department,
                        tatMinutes,
                        sampleId,
                        slug,
                        modelImage: modelImage || null,
                        icon: icon || null,
                        description: description || null,
                        fastingRequired: fastingRequired || false
                    },
                    type: QueryTypes.UPDATE,
                    transaction: testTx
                }
            );

            // update parameters: delete old and insert new
            await sequelize.query(
                `DELETE FROM medibridge.test_parameters
                WHERE test_id = :testId`,
                {
                    replacements: { testId: id },
                    type: QueryTypes.DELETE,
                    transaction: testTx
                }
            );

            for (const paramCode of parameters) {
                await sequelize.query(
                    `INSERT INTO medibridge.test_parameters (test_id, parameter) 
                    VALUES (:testId, :paramCode)`,
                    {
                        replacements: { testId: id, paramCode },
                        type: QueryTypes.INSERT,
                        transaction: testTx
                    }
                );
            }

            await testTx.commit();
            commited = true;
            return { success: true, message: "Test updated successfully" };

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

export async function deleteTest(data) {
    const { id } = data;
    if (!id) {
        return { success: false, message: "Missing required fields" };
    }

    const deletionTx = await sequelize.transaction();
    let commited = false;

    try {
        const [existingTest] = await sequelize.query(
            `SELECT * FROM medibridge.test
            WHERE id = :id`,
            {
                replacements: { id },
                type: QueryTypes.SELECT,
                transaction: deletionTx
            }
        );
        if (!existingTest) {
            return { success: false, message: "Test not found" };
        }

        await sequelize.query(
            `DELETE FROM medibridge.test
            WHERE id = :id`,
            {
                replacements: { id },
                type: QueryTypes.DELETE,
                transaction: deletionTx
            }
        );

        await deletionTx.commit();
        commited = true;
        return { success: true, message: "Test deleted successfully" };

    } catch (error) {
        console.error("Error in deleteTest:", error, data);
        return { success: false, message: "Server error" };
    } finally {
        if (!commited) {
            await deletionTx.rollback();
        }
    }
}

export async function updateTestStatus(data) {
    const { id, status } = data;
    if (!id || !status) {
        return { success: false, message: "Missing required fields" };
    }
    const validStatuses = ["active", "inactive", "archived", 'draft'];
    if (!validStatuses.includes(status)) {
        return { success: false, message: "Invalid status value" };
    }

    const updateTx = await sequelize.transaction();
    let commited = false;

    try {
        const [existingTest] = await sequelize.query(
            `SELECT * FROM medibridge.test
            WHERE id = :id`,
            {
                replacements: { id },
                type: QueryTypes.SELECT,
                transaction: updateTx
            }
        );
        if (!existingTest) {
            return { success: false, message: "Test not found" };
        }

        await sequelize.query(
            `UPDATE medibridge.test
            SET status = :status
            WHERE id = :id`,
            {
                replacements: { id, status },
                type: QueryTypes.UPDATE,
                transaction: updateTx
            }
        );

        await updateTx.commit();
        commited = true;
        return { success: true, message: "Test status updated successfully" };

    } catch (error) {
        console.error("Error in updateTestStatus:", error, data);
        return { success: false, message: "Server error" };
    }
    finally {
        if (!commited) {
            await updateTx.rollback();
        }
    }
}