import { Sequelize } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

export async function updateDepartment(data) {
    const { id, name, code, image, description } = data;
    if (!id || !name || !code || !image || !description) {
        console.log("Invalid department data:", data);
        return false;
    }

    const updateTx = await sequelize.transaction();
    let isCommited = false

    try {
        await sequelize.query(
            `UPDATE medibridge.departments 
                SET
                    name = :newName,
                    image = :newImage,
                    description = :newDescription
                WHERE
                    id = :id
                    AND code = :code
            `,
            {
                replacements: { newName: name, newImage: image, newDescription: description, id, code },
            }
        );
        await updateTx.commit();
        isCommited = true;
    } catch (error) {
        console.error("Error in updating the department", data, error)
        await updateTx.rollback();
        isCommited = true
        return false
    } finally {
        if (!isCommited) {
            await updateTx.rollback();
        }
        return true
    }

    return false
    // Proceed with the update logic
    return true;
}