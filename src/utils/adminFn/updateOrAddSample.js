import { sequelize } from "../postgress/postgress.js";

export async function updateOrAddSample(data) {
    if (!data || !data.name) {
        console.error("Missing required fields in sample for adding/updating parameter.");
        return false;
    }
    const { id, name, icon } = data;
    let committed = false;
    const tx = await sequelize.transaction();

    try {
        const isNew = !id;
        if (isNew) {
            const nameExists = await sequelize.query(
                `
                SELECT 1 FROM medibridge.sample_type
                WHERE Lower(name)= Lower(:name)
                LIMIT 1
                `,
                {
                    replacements: { name: name.trim() },
                    transaction: tx,
                    type: sequelize.QueryTypes.SELECT,
                }
            );

            if (nameExists.length > 0) {
                console.error("Sample with this name already exists.");
                try { await tx.rollback(); } catch { }
                committed = true;
                return false;
            }

            const id = name.replace(/\s+/g, '_').toLowerCase();

            await sequelize.query(
                `
                INSERT INTO medibridge.sample_type (id,name, icon)
                VALUES (:id, :name, :icon)
                `,
                {
                    replacements: { id, name: name.trim(), icon: icon || null },
                    transaction: tx,
                }
            );
            await tx.commit();
            committed = true;
            return true;
        } else {
            const rows = await sequelize.query(
                `
                SELECT id, name
                FROM medibridge.sample_type
                WHERE id = :id
          `,
                {
                    replacements: { id },
                    type: sequelize.QueryTypes.SELECT,
                    transaction: tx,
                }
            );

            const existing = rows[0]; // <-- SELECT returns an array
            if (!existing) {
                await tx.rollback();
                committed = true;
                return false; // nothing to update
            }

            if (existing.name === name && existing.icon === icon) {
                // no change necessary
                await tx.commit();
                committed = true;
                return false;
            }

            await sequelize.query(
                `
                UPDATE medibridge.sample_type
                SET name = :name, icon = :icon
                WHERE id = :id
          `,
                {
                    replacements: { name: name.trim(), icon: icon || null, id },
                    transaction: tx,
                }
            );

            await tx.commit();
            committed = true;
            return true;
        }


    } catch (error) {
        try { await tx.rollback(); } catch { }
        console.error("Error updating or adding Sample:", error, data);
        committed = true;
        return false;
    } finally {
        if (!committed) {
            try { await tx.rollback(); } catch { }
        }
    }

}

export async function deleteSample(data) {
    const { id, name } = data || {};
    if (!id || !name) {
        console.error("Missing required fields for deleting parameter.");
        return false;
    }

    const tx = await sequelize.transaction();
    try {
        await sequelize.query(
            `
            DELETE FROM medibridge.sample_type
            WHERE id = :id
            AND name = :name
      `,
            {
                replacements: { id, name: name.trim() },
                transaction: tx,
            }
        );
        await tx.commit();
        return true;
    } catch (error) {
        try { await tx.rollback(); } catch { }
        console.error("Error deleting parameter:", error);
        return false;
    }
}
