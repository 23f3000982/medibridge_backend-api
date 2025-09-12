import { QueryTypes, Sequelize } from "sequelize";
import { sequelize } from "../postgress/postgress.js";
import { HomeBanner } from "../../constantTypes.js";

export async function UpdateBanner(bannerData: HomeBanner) {
    const { bannerId, title, redirectUrl, phoneImage, desktopImage, description } = bannerData;

    const isNew = !bannerId;

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
                SELECT
                    banner_id, title
                FROM medibridge.home_banners
                WHERE banner_id = :bannerId
                `,
                {
                    replacements: { bannerId },
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
                WHERE banner_id = :bannerId
                `,
                {
                    replacements: {
                        bannerId,
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


export async function deleteBanner(data: HomeBanner) {
    const { bannerId } = data;
    let committed = false;
    const tx = await sequelize.transaction();

    try {
        const rows = await sequelize.query(
            `
            SELECT
                banner_id
            FROM medibridge.home_banners
            WHERE banner_id = :bannerId
            `,
            {
                replacements: { bannerId },
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
            WHERE banner_id = :bannerId
            `,
            {
                replacements: { bannerId },
                transaction: tx,
            }
        );
        await tx.commit();
        committed = true;
        return { success: true, message: "Banner deleted successfully." };
    } catch (error) {
        console.error("Error in deleting Banner:", error, data);
        return { success: false, message: "An error occurred." };
    } finally {
        if (!committed) {
            await tx.rollback();
        }
    }
}