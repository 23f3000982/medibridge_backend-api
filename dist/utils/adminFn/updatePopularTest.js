import { sequelize } from "../postgress/postgress.js";
export async function updatePopularTest(popularTestdata) {
    // 1) Normalize input: sort by numeric key, drop duplicates by test.id, compact to 1..N
    const entries = Object.entries(popularTestdata)
        .filter(([, v]) => v && Number.isFinite(Number(v.testId)));
    // sort by original numeric position key (e.g., '1','3','7' → 1,3,7)
    entries.sort((a, b) => Number(a[0]) - Number(b[0]));
    const seen = new Set();
    const compact = [];
    for (const [, v] of entries) {
        const tid = Number(v.testId);
        if (seen.has(tid))
            continue;
        seen.add(tid);
        compact.push(tid);
    }
    // build [{position, test_id}]
    const positions = compact.map((testId, idx) => ({
        position: idx + 1,
        test_id: testId
    }));
    if (positions.length === 0) {
        return { success: true, message: "No tests to save", data: [] };
    }
    let isCommited = false;
    const tx = await sequelize.transaction();
    console.log(positions);
    try {
        const binds = [];
        const valuesSql = positions.map((p, i) => {
            const a = 2 * i + 1;
            const b = 2 * i + 2;
            binds.push(p.position, p.test_id);
            return `($${a}, $${b})`;
        }).join(",");
        await sequelize.query(`
            INSERT INTO medibridge.popular_test (id, test_id)
            VALUES ${valuesSql}
            ON CONFLICT (id) DO UPDATE
                SET test_id = EXCLUDED.test_id
            `, { bind: binds, transaction: tx });
        // prune any rows beyond new max N
        await sequelize.query(`DELETE FROM medibridge.popular_test WHERE id > $1`, { bind: [positions.length], transaction: tx });
        await tx.commit();
        isCommited = true;
        return { success: true, message: "Popular tests saved successfully", data: positions };
    }
    catch (error) {
        console.error("Error saving popular tests:", error, popularTestdata);
        return { success: false, message: "Internal server error" };
    }
    finally {
        if (!isCommited) {
            await tx.rollback();
        }
    }
}
