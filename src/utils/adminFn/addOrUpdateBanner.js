import { QueryTypes, Sequelize } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

export async function addOrUpdateBanner(bannerData) {
    const { id, title, redirectUrl, phoneImage, desktopImage, description } = bannerData;

    const isNew = !id;

    let committed = false;
    const tx = await sequelize.transaction();

    try {
        if (isNew) {
            // Check for existing banner with the same title
            const titleExists = await sequelize.query(
                `
                SELECT 1 FROM medibridge.home_banners
                WHERE Lower(title) = Lower(:title)
                LIMIT 1
                `,
                {
                    replacements: { title: title.trim() },
                    transaction: tx,
                    type: QueryTypes.SELECT,
                }
            );

            if (titleExists.length > 0) {
                return {
                    success: false,
                    message: "Banner with this title already exists.",
                }
            }

            await sequelize.query(
                `
                INSERT INTO medibridge.home_banners (title, redirect_url, phone_image, desktop_image, description)
                VALUES (:title, :redirectUrl, :phoneImage, :desktopImage, :description)
                `,
                {
                    replacements: {
                        title: title.trim(),
                        redirectUrl: redirectUrl || null,
                        phoneImage: phoneImage || null,
                        desktopImage: desktopImage || null,
                        description: description || null,
                    },
                    transaction: tx,
                }
            );
            await tx.commit();
            committed = true;
            return { success: true, message: "Banner added successfully." };
        } else {
            const rows = await sequelize.query(
                `
                SELECT id, title
                FROM medibridge.home_banners
                WHERE id = :id
                `,
                {
                    replacements: { id },
                    type: QueryTypes.SELECT,
                    transaction: tx,
                }
            );

            const existing = rows[0]; // <-- SELECT returns an array
            if (!existing) {
                return { success: false, message: "Banner not found." };
            }

            await sequelize.query(
                `
                UPDATE medibridge.home_banners
                SET title = :title,
                    redirect_url = :redirectUrl,
                    phone_image = :phoneImage,
                    desktop_image = :desktopImage,
                    description = :description
                WHERE id = :id
                `,
                {
                    replacements: {
                        id,
                        title: title.trim(),
                        redirectUrl: redirectUrl || null,
                        phoneImage: phoneImage || null,
                        desktopImage: desktopImage || null,
                        description: description || null,
                    },
                    transaction: tx,
                }
            );
            await tx.commit();
            committed = true;
            return { success: true, message: "Banner updated successfully." };
        }
    } catch (error) {
        console.error("Error in updating or adding Banner:", error, bannerData);
        return { success: false, message: "An error occurred." };
    } finally {
        if (!committed) {
            await tx.rollback();
        }
    }

}


export async function deleteBanner(bannerData) {
    const { id } = bannerData
    let committed = false;
    const tx = await sequelize.transaction();

    try {
        const rows = await sequelize.query(
            `
            SELECT id
            FROM medibridge.home_banners
            WHERE id = :id
            `,
            {
                replacements: { id: id },
                type: QueryTypes.SELECT,
                transaction: tx,
            }
        );

        const existing = rows[0]; // <-- SELECT returns an array
        if (!existing) {
            return { success: false, message: "Banner not found." };
        }

        await sequelize.query(
            `
            DELETE FROM medibridge.home_banners
            WHERE id = :id
            `,
            {
                replacements: { id: id },
                transaction: tx,
            }
        );
        await tx.commit();
        committed = true;
        return { success: true, message: "Banner deleted successfully." };
    } catch (error) {
        console.error("Error in deleting Banner:", error, bannerData);
        return { success: false, message: "An error occurred." };
    } finally {
        if (!committed) {
            await tx.rollback();
        }
    }
}