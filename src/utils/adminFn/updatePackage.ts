import { Packages, SubPackage } from "../../constantTypes.js";
import { sequelize } from "../postgress/postgress.js";

export async function updatePackage(data: Packages) {
    const { packageId, name, slug, title, description, icon, modelImage } = data;

    if (!name || !slug || !title) {
        return { success: false, message: "Name, Slug, and Title are required" };
    }

    const isNew = !packageId;
    let packageRecord;

    const updateTx = await sequelize.transaction();
    let isCommitted = false;

    try {
        if (isNew) {
            const [insertData] = await sequelize.query(`
                INSERT INTO medibridge.packages(name,slug,title,description,icon,model_image)
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
                UPDATE medibridge.packages
                SET 
                    name = :name, 
                    slug = :slug, 
                    title = :title, 
                    description = :description, 
                    icon = :icon, 
                    model_image = :modelImage
                WHERE 
                    package_id = :packageId
                RETURNING *;
                `,
                {
                    replacements: { packageId, name, slug, title, description, icon, modelImage },
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
        return { success: false, message: "Package Not uodated" };
    } finally {
        if (!isCommitted) {
            await updateTx.rollback();
        }
    }
}


export async function deletePackage(data: Packages) {
    const { packageId } = data;
    const deleteTx = await sequelize.transaction();
    let isCommitted = false;

    try {

        const currPackageDataRaw = await sequelize.query(`
            SELECT 
                p.* ,
                s.sub_package_id as sub_package_id,
                s.name as sub_package_name
            FROM medibridge.packages p
            LEFT JOIN medibridge.sub_packages s on s.package_id = p.package_id
            WHERE p.package_id = :packageId
        `, {
            replacements: { packageId },
            transaction: deleteTx
        })
        if (currPackageDataRaw[0].length <= 0) {
            return { success: false, message: "Package not found" };
        }
        const subPackagesCount = currPackageDataRaw[0].filter((d: any) => d.sub_package_id).length;
        if (subPackagesCount > 0) {
            return { success: false, message: "Cannot delete package with associated sub-packages" };
        }

        const [deleteData] = await sequelize.query(`
            DELETE FROM medibridge.packages
            WHERE package_id = :packageId
            RETURNING *;
        `, {
            replacements: { packageId },
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
export async function updateSubPackage(data: SubPackage) {
    const { subPackageId, packageId, name, title, slug, crelioId, tat, price, description, icon, modelImage, testIds } = data;
    if (!name || !slug || !crelioId || !tat || !price || !packageId || !title) {
        return { success: false, message: "Name, Title, Slug, Crelio ID, TAT, Price and Parent Package are required" };
    }
    const isNew = !Number(subPackageId);

    const updateTx = await sequelize.transaction();
    let isCommitted = false;

    try {
        // Check if parent package exists
        const [parentPackageData] = await sequelize.query(`
            SELECT * FROM 
            medibridge.packages WHERE package_id = :packageId
        `, {
            replacements: { packageId: packageId },
            transaction: updateTx
        });
        if (parentPackageData.length === 0) {
            return { success: false, message: "Parent package not found" };
        }

        let subPackageRecord: { sub_package_id: number };
        if (isNew) {
            const [insertData] = await sequelize.query(`
                INSERT INTO medibridge.sub_packages(name,title,slug,crelio_id,tat,price,description,icon,model_image,package_id)
                VALUES(:name,:title,:slug,:crelioId,:tat,:price,:description,:icon,:modelImage,:packageId)
                RETURNING *;
                `,
                {
                    replacements: { name, title, slug, crelioId, tat, price, description, icon, modelImage, packageId: packageId, parentPackageId: packageId },
                    transaction: updateTx,
                }
            )
            subPackageRecord = insertData[0] as { sub_package_id: number }
        } else {
            const [updateData] = await sequelize.query(`
                UPDATE medibridge.sub_packages
                SET 
                    name= :name,
                    slug= :slug,
                    title= :title, 
                    crelio_id= :crelioId, 
                    tat= :tat, price= :price, 
                    description= :description, 
                    icon= :icon, 
                    model_image= :modelImage, 
                    package_id= :packageId
                WHERE 
                    sub_package_id= :subPackageId
                RETURNING *;
                `,
                {
                    replacements: { subPackageId, name, title, slug, crelioId, tat, price, description, icon, modelImage, packageId },
                    transaction: updateTx,
                }
            )
            subPackageRecord = updateData[0] as { sub_package_id: number };
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
                replacements: { subPackageId: subPackageRecord.sub_package_id },
                transaction: updateTx,
            });

            // Then, add new associations
            for (const testId of testIds) {
                await sequelize.query(`
                    INSERT INTO medibridge.sub_package_tests(sub_package_id, test_id)
                    VALUES(:subPackageId, :testId)
                `, {
                    replacements: { subPackageId: subPackageRecord.sub_package_id, testId },
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

export async function deleteSubPackage(data: SubPackage) {
    const { subPackageId, packageId } = data;
    const deleteTx = await sequelize.transaction();
    let isCommitted = false;

    try {

        const currSubPackageDataRaw = await sequelize.query(`
            SELECT * 
            FROM medibridge.sub_packages
            WHERE 
                sub_package_id = :subPackageId
                AND package_id = :packageId
        `, {
            replacements: { subPackageId, packageId },
            transaction: deleteTx
        })
        if (currSubPackageDataRaw[0].length <= 0) {
            return { success: false, message: "Sub-package not found" };
        }

        const [deleteData] = await sequelize.query(`
            DELETE FROM medibridge.sub_packages
            WHERE 
                sub_package_id = :subPackageId
                AND package_id = :packageId
            RETURNING *;
        `, {
            replacements: { subPackageId, packageId },
            transaction: deleteTx
        })

        await deleteTx.commit();
        isCommitted = true;
        return { success: true, message: "Sub-package deleted successfully" };
    } catch (error) {
        console.error("Error deleting sub-package:", error);
        return { success: false, message: "Failed to delete sub-package" };
    } finally {
        if (!isCommitted) {
            await deleteTx.rollback();
        }
    }

}