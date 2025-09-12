import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

export async function updateOrAddSample(data: any) {
    if (!data || !data.name) {
        console.error("Missing required fields in sample for adding/updating parameter.");
        return {
            success: false,
            message: "Missing required fields",
        }
    }
    const { sampleId, name, icon } = data;
    let committed = false;
    const tx = await sequelize.transaction();

    try {
        const isNew = !sampleId;
        if (isNew) {
            const nameExists = await sequelize.query(
                `
                SELECT 1 FROM medibridge.samples
                WHERE Lower(name)= Lower(:name)
                LIMIT 1
                `,
                {
                    replacements: { name: name.trim() },
                    transaction: tx,
                    type: QueryTypes.SELECT,
                }
            );

            if (nameExists.length > 0) {
                console.error("Sample with this name already exists.");
                try { await tx.rollback(); } catch { }
                committed = true;
                return {
                    success: false,
                    message: "Sample with this name already exists.",
                }
            }

            const sampleId = name.replace(/\s+/g, '_').toLowerCase();

            await sequelize.query(
                `
                INSERT INTO medibridge.samples (sample_id,name, icon)
                VALUES (:sampleId, :name, :icon)
                `,
                {
                    replacements: {
                        sampleId: sampleId,
                        name: name.trim(),
                        icon: icon || null
                    },
                    transaction: tx,
                }
            );
            await tx.commit();
            committed = true;
            return { success: true, message: "Sample added successfully." };
        } else {
            const rows = await sequelize.query(
                `
                SELECT
                    *
                FROM medibridge.samples
                WHERE sample_id = :sampleId
                `,
                {
                    replacements: {
                        sampleId: sampleId
                    },
                    type: QueryTypes.SELECT,
                    transaction: tx,
                }
            );

            const existing = rows[0] as { sample_id: string; name: string; icon: string | null }; // <-- SELECT returns an array
            if (!existing) {
                await tx.rollback();
                committed = true;
                return {
                    success: false,
                    message: "Sample not found for update.",
                }
            }

            if (existing.name === name && existing.icon === icon) {
                // no change necessary
                await tx.commit();
                committed = true;
                return { success: true, message: "No changes made." };
            }

            const newId = name.replace(/\s+/g, '_').toLowerCase();
            await sequelize.query(
                `
                UPDATE medibridge.samples
                SET
                    name = :name,
                    icon = :icon,
                    sample_id = CASE WHEN :newId != sample_id THEN :newId ELSE sample_id END
                WHERE sample_id = :sampleId
          `,
                {
                    replacements: {
                        name: name.trim(),
                        icon: icon || null,
                        sampleId,
                        newId
                    },
                    transaction: tx,
                }
            );

            await tx.commit();
            committed = true;
            return { success: true, message: "Sample updated successfully." };
        }


    } catch (error) {
        try { await tx.rollback(); } catch { }
        console.error("Error updating or adding Sample:", error, data);
        committed = true;
        return {
            success: false,
            message: "Error updating or adding Sample.",
        }
    } finally {
        if (!committed) {
            try { await tx.rollback(); } catch { }
        }
    }

}

export async function deleteSample(data: any) {
    const { sampleId, name } = data;
    if (!sampleId || !name) {
        console.error("Missing required fields for deleting parameter.");
        return {
            success: false,
            message: "Missing required fields",
        }
    }

    try {
        await sequelize.query(
            `
            DELETE FROM medibridge.samples
            WHERE sample_id = :sampleId
            AND name = :name
      `,
            {
                replacements: {
                    sampleId,
                    name: name.trim()
                },
            }
        );
        return {
            success: true,
            message: "Sample deleted successfully."
        };
    } catch (error) {
        console.error("Error deleting parameter:", error);
        return { success: false, message: "Error deleting Sample." };
    }
}
