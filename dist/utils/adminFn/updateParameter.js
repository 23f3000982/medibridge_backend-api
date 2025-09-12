import { QueryTypes } from "sequelize";
import { sequelize } from "../postgress/postgress.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Insert-or-update Parameter.
 * - Create new when (id is 0/undefined/null) AND !code
 * - Update name when (id, code) matches an existing row
 */
export async function updateParameter(data) {
    const { name, parameterId, parameterCode } = data;
    if (!name || !name.trim()) {
        console.error("Missing or invalid 'name' for parameter.");
        return {
            success: false,
            message: "Missing or invalid 'name' for parameter.",
        };
    }
    let committed = false;
    const tx = await sequelize.transaction();
    const isNew = (parameterId === 0 || parameterId === undefined || parameterId === null) && !parameterCode;
    try {
        // CREATE path
        if (isNew) {
            // Optimistic retry: avoid locks; gapless by retrying on (id) conflict
            const sql = `
                WITH nxt AS (
                SELECT COALESCE(MAX(parameter_id), 0) + 1 AS parameter_id
                FROM medibridge.parameters
                ),
                ins AS (
                INSERT INTO medibridge.parameters (parameter_id, name, parameter_code)
                SELECT parameter_id,
                        :name,
                        'PMTR' || LPAD(parameter_id::text, 3, '0')
                FROM nxt
                ON CONFLICT (parameter_id) DO NOTHING
                RETURNING parameter_id, parameter_code
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
                    return { success: true, message: "Parameter created", parameter: rows[0] };
                }
                // no row inserted => a concurrent txn won the race; retry
                await sleep(10 + Math.floor(Math.random() * 40));
            }
            // give up after retries
            console.error("Failed to create parameter after retries.");
            return {
                success: false,
                message: "Failed to create parameter after retries.",
            };
        }
        // UPDATE path
        const rows = await sequelize.query(`
            SELECT 
                parameter_id,
                name,
                parameter_code
            FROM medibridge.parameters
            WHERE parameter_id = :parameterId AND parameter_code = :parameterCode
      `, {
            replacements: { parameterId, parameterCode },
            type: QueryTypes.SELECT,
            transaction: tx,
        });
        const existing = rows[0]; // <-- SELECT returns an array
        if (!existing) {
            console.error("No matching parameter found for update.");
            return {
                success: false,
                message: "No matching parameter found for update.",
            };
        }
        if (existing.name === name) {
            // no change necessary
            await tx.commit();
            committed = true;
            return { success: true, message: "No changes made to parameter." };
        }
        await sequelize.query(`
            UPDATE medibridge.parameters
                SET name = :name
            WHERE
                parameter_id = :parameterId
                AND parameter_code = :parameterCode
      `, {
            replacements: {
                name: name.trim(),
                parameterId: existing.parameter_id,
                parameterCode: existing.parameter_code
            },
            transaction: tx,
        });
        await tx.commit();
        committed = true;
        return { success: true, message: "Parameter updated." };
    }
    catch (error) {
        console.error("Error updating parameter:", error);
        return { success: false, message: "Error updating parameter." };
    }
    finally {
        if (!committed) {
            await tx.rollback();
        }
    }
}
export async function deleteParameter(data) {
    const { parameterId, name, parameterCode } = data;
    if (!parameterId || !name || !parameterCode) {
        console.error("Missing required fields for deleting parameter.");
        return {
            success: false,
            message: "Missing required fields for deleting parameter.",
        };
    }
    try {
        await sequelize.query(`
            DELETE FROM medibridge.parameters
            WHERE parameter_id = :parameterId
                AND name = :name
                AND parameter_code = :parameterCode
      `, {
            replacements: { parameterId, name: name.trim(), parameterCode },
        });
        return { success: true, message: "Parameter deleted." };
    }
    catch (error) {
        console.error("Error deleting parameter:", error);
        return { success: false, message: "Error deleting parameter." };
    }
}
