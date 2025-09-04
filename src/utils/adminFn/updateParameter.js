import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Insert-or-update Parameter.
 * - Create new when (id is 0/undefined/null) AND !code
 * - Update name when (id, code) matches an existing row
 */
export async function updateParameter(data) {
    const { name, id, code } = data || {};
    if (!name || typeof name !== "string" || !name.trim()) {
        return false;
    }

    let committed = false;
    const tx = await sequelize.transaction();
    try {
        // CREATE path
        if ((id === 0 || id === undefined || id === null) && !code) {
            // Optimistic retry: avoid locks; gapless by retrying on (id) conflict
            const sql = `
                WITH nxt AS (
                SELECT COALESCE(MAX(id), 0) + 1 AS id
                FROM medibridge.parameters
                ),
                ins AS (
                INSERT INTO medibridge.parameters (id, name, parameter_code)
                SELECT id,
                        :name,
                        'PMTR' || LPAD(id::text, 3, '0')
                FROM nxt
                ON CONFLICT (id) DO NOTHING
                RETURNING id, parameter_code
                )
                SELECT * FROM ins;
      `;

            const maxRetries = 8;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                const rows = await sequelize.query(sql, {
                    type: QueryTypes.SELECT,
                    transaction: tx,
                    replacements: { name: name.trim() },
                });

                if (rows.length) {
                    await tx.commit();
                    committed = true;
                    return true; // or return rows[0] if you want the new id/code back
                }

                // no row inserted => a concurrent txn won the race; retry
                await sleep(10 + Math.floor(Math.random() * 40));
            }

            // give up after retries
            await tx.rollback();
            committed = true;
            return false;
        }

        // UPDATE path
        const rows = await sequelize.query(
            `
            SELECT id, name, parameter_code
            FROM medibridge.parameters
            WHERE id = :id AND parameter_code = :code
      `,
            {
                replacements: { id, code },
                type: QueryTypes.SELECT,
                transaction: tx,
            }
        );

        const existing = rows[0]; // <-- SELECT returns an array
        if (!existing) {
            await tx.rollback();
            committed = true;
            return false; // nothing to update
        }

        if (existing.name === name) {
            // no change necessary
            await tx.commit();
            committed = true;
            return false;
        }

        await sequelize.query(
            `
            UPDATE medibridge.parameters
            SET name = :name
            WHERE id = :id
      `,
            {
                replacements: { name: name.trim(), id },
                transaction: tx,
            }
        );

        await tx.commit();
        committed = true;
        return true;
    } catch (error) {
        try { await tx.rollback(); } catch { }
        console.error("Error updating parameter:", error);
        committed = true;
        return false;
    } finally {
        if (!committed) {
            try { await tx.rollback(); } catch { }
        }
    }
}

export async function deleteParameter(data) {
    const { id, name, code } = data || {};
    if (!id || !name || !code) {
        console.error("Missing required fields for deleting parameter.");
        return false;
    }

    const tx = await sequelize.transaction();
    try {
        await sequelize.query(
            `
      DELETE FROM medibridge.parameters
      WHERE id = :id
        AND name = :name
        AND parameter_code = :code
      `,
            {
                replacements: { id, name: name.trim(), code },
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
