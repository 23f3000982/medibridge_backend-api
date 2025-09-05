import { Sequelize } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

export async function updateDepartment(data) {
    const { id, name, code, image, description } = data;
    if (!id || !name || !code || !image || !description) {
        console.log("Invalid department data:", data);
        return {
            success: false,
            message: "Invalid department data",
        }
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
        return {
            success: true,
            message: "Department updated successfully",
        }
    } catch (error) {
        console.error("Error in updating the department", data, error)
        await updateTx.rollback();
        isCommited = true
        return {
            success: false,
            message: "Error in updating the department",
        }
    } finally {
        if (!isCommited) {
            await updateTx.rollback();
        }
    }

}