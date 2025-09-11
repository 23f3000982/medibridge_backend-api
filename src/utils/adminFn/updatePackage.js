import { sequelize } from "../postgress/postgress.js";

export async function updatePackage(data) {
    const { id, name, slug, title, description, icon, modelImage } = data;
    if (!name || !slug || !title) {
        return { success: false, message: "Name, Slug, and Title are required" };
    }

    const isNew = !id;
    let packageRecord;

    const updateTx = await sequelize.transaction();
    let isCommitted = false;

    try {
        if (isNew) {
            const [insertData] = await sequelize.query(`
                INSERT INTO medibridge.package(name,slug,title,description,icon,model_image)
                VALUES(:name,:slug,:title,:description,:icon,:modelImage)
                RETURNING *;
                `,
                {
                    replacements: { name, slug, title, description, icon, modelImage },
                    transaction: updateTx,
                }
            )
            packageRecord = insertData[0]
        } else {
            const [updateData] = await sequelize.query(`
                UPDATE medibridge.package
                SET name= :name, slug= :slug, title= :title, description= :description, icon= :icon, model_image= :modelImage
                WHERE 
                    id= :id
                RETURNING *;
                `,
                {
                    replacements: { id, name, slug, title, description, icon, modelImage },
                    transaction: updateTx,
                }
            )
            packageRecord = updateData[0]
        }
        if (!packageRecord) {
            return { success: false, message: "Failed to update package" };
        }
        await updateTx.commit();
        isCommitted = true;
        return {
            success: true, message: isNew ? "Package created successfully" : "Package updated successfully", package: packageRecord
        };
    } catch (error) {
        console.error("Error updating package:", error);
        return { success: false, message: "Package updated successfully" };
    } finally {
        if (!isCommitted) {
            await updateTx.rollback();
        }
    }
}


export async function deletePackage(data) {
    const { id } = data;
    const deleteTx = await sequelize.transaction();
    let isCommitted = false;

    try {

        const currPackageDataRaw = await sequelize.query(`
            SELECT 
                p.* ,
                s.id as sub_package_id,
                s.name as sub_package_name
            FROM medibridge.package p
            LEFT JOIN medibridge.sub_packages s on s.package_id = p.id
            WHERE p.id = :id
        `, {
            replacements: { id },
            transaction: deleteTx
        })
        if (currPackageDataRaw[0].length <= 0) {
            return { success: false, message: "Package not found" };
        }
        const subPackagesCount = currPackageDataRaw[0].filter(d => d.sub_package_id).length;
        if (subPackagesCount > 0) {
            return { success: false, message: "Cannot delete package with associated sub-packages" };
        }

        const [deleteData] = await sequelize.query(`
            DELETE FROM medibridge.package
            WHERE id = :id
            RETURNING *;
        `, {
            replacements: { id },
            transaction: deleteTx
        })

        if (deleteData.length > 0) {
            await deleteTx.commit();
            isCommitted = true;
            return { success: true, message: "Package deleted successfully" };
        }
        return { success: false, message: "Failed to delete package" };
    } catch (error) {
        console.error("Error deleting package:", error);
        return { success: false, message: "Failed to delete package" };
    } finally {
        if (!isCommitted) {
            await deleteTx.rollback();
        }
    }

}


// subpackage
export async function updateSubPackage(data) {
    const { id, name, slug, crelioId, tat, price, description, icon, modelImage, testIds, parentPackageId } = data;
    if (!name || !slug || !crelioId || !tat || !price || !parentPackageId) {
        return { success: false, message: "Name, Slug, Crelio ID, TAT, Price and Parent Package are required" };
    }
    const isNew = !Number(id);

    const updateTx = await sequelize.transaction();
    let isCommitted = false;

    try {
        // Check if parent package exists
        const [parentPackageData] = await sequelize.query(`
            SELECT * FROM medibridge.package WHERE id = :parentPackageId
        `, {
            replacements: { parentPackageId },
            transaction: updateTx
        });
        if (parentPackageData.length === 0) {
            return { success: false, message: "Parent package not found" };
        }

        let subPackageRecord;
        if (isNew) {
            const [insertData] = await sequelize.query(`
                INSERT INTO medibridge.sub_packages(name,slug,crelio_id,tat,price,description,icon,model_image,package_id)
                VALUES(:name,:slug,:crelioId,:tat,:price,:description,:icon,:modelImage,:parentPackageId)
                RETURNING *;
                `,
                {
                    replacements: { name, slug, crelioId, tat, price, description, icon, modelImage, parentPackageId },
                    transaction: updateTx,
                }
            )
            subPackageRecord = insertData[0]
        } else {
            const [updateData] = await sequelize.query(`
                UPDATE medibridge.sub_packages
                SET 
                    name= :name,
                    slug= :slug, 
                    crelio_id= :crelioId, 
                    tat= :tat, price= :price, 
                    description= :description, 
                    icon= :icon, 
                    model_image= :modelImage, 
                    package_id= :parentPackageId
                WHERE 
                    id= :id
                RETURNING *;
                `,
                {
                    replacements: { id, name, slug, crelioId, tat, price, description, icon, modelImage, parentPackageId },
                    transaction: updateTx,
                }
            )
            subPackageRecord = updateData[0]
        }
        if (!subPackageRecord) {
            return { success: false, message: "Failed to update sub-package" };
        }

        // Handle tests association
        if (Array.isArray(testIds)) {
            // First, remove existing associations
            await sequelize.query(`
                DELETE FROM medibridge.sub_package_tests WHERE sub_package_id = :subPackageId
            `, {
                replacements: { subPackageId: subPackageRecord.id },
                transaction: updateTx,
            });

            // Then, add new associations
            for (const testId of testIds) {
                await sequelize.query(`
                    INSERT INTO medibridge.sub_package_tests(sub_package_id, test_id)
                    VALUES(:subPackageId, :testId)
                `, {
                    replacements: { subPackageId: subPackageRecord.id, testId },
                    transaction: updateTx,
                });
            }
        }

        await updateTx.commit();
        isCommitted = true;
        return {
            success: true, message: isNew ? "Sub-package created successfully" : "Sub-package updated successfully", subPackage: subPackageRecord
        };

    } catch (error) {
        console.error("Error updating sub-package:", error, data);
        return { success: false, message: "Failed to update sub-package" };

    } finally {
        if (!isCommitted) {
            await updateTx.rollback();
        }
    }

}