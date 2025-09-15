import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";
export async function updateDepartment(data) {
    const { departmentId, deptCode, name, image, description, totalTests } = data;
    if (!departmentId || !name || !deptCode || !image || !description || !totalTests) {
        console.error("Invalid department data:", data);
        return {
            success: false,
            message: "Invalid department data",
        };
    }
    const updateTx = await sequelize.transaction();
    let isCommited = false;
    try {
        await sequelize.query(`UPDATE medibridge.departments 
                SET
                    name = :newName,
                    image = :newImage,
                    description = :newDescription
                WHERE
                    dept_id = :dept_id
                    AND dept_code = :dept_code
            `, {
            replacements: {
                newName: name,
                newImage: image,
                newDescription: description,
                dept_id: departmentId,
                dept_code: deptCode,
            },
            type: QueryTypes.UPDATE,
            transaction: updateTx,
        });
        await updateTx.commit();
        isCommited = true;
        return {
            success: true,
            message: "Department updated successfully",
        };
    }
    catch (error) {
        console.error("Error in updating the department", data, error);
        await updateTx.rollback();
        isCommited = true;
        return {
            success: false,
            message: "Error in updating the department",
        };
    }
    finally {
        if (!isCommited) {
            await updateTx.rollback();
        }
    }
}
