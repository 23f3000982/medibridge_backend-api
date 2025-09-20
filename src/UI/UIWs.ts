// ws/UIWS.ts
import { Server, Socket } from "socket.io";
import { getAllTests } from "../utils/cache/cache.js";
import { Test } from "../constantTypes.js";
import { toSendableTest } from "../uiEndpoints/tests.js";

export function setupUiWs(io: Server) {
    const UI_WS = io.of("/public");

    UI_WS.on("connection", (socket: Socket) => {
        console.log("✅ UI_WS Connected:", socket.id);

        socket.on("filterTests", async (data) => {
            const { query } = data;
            if (!query) {
                return socket.emit("filterTests", []);
            }

            const q = query.toLowerCase();
            const allTests: Test[] = await getAllTests();

            // score each test for better ranking
            const scored = allTests
                .map((t: Test) => {
                    const name = String(t?.name ?? "");
                    const slug = String(t?.slug ?? "");
                    const idStr = String(t?.testId ?? "");

                    const nameL = name.toLowerCase();
                    const slugL = slug.toLowerCase();
                    const idL = idStr.toLowerCase();

                    let score = 0;

                    // exact matches
                    if (idL === q) score = 100;
                    else if (nameL === q) score = 90;
                    else if (slugL === q) score = 85;

                    // prefix matches
                    else if (nameL.startsWith(q)) score = 75;
                    else if (slugL.startsWith(q)) score = 70;
                    else if (idL.startsWith(q)) score = 68;

                    // substring matches
                    else if (nameL.includes(q)) score = 60;
                    else if (slugL.includes(q)) score = 55;
                    else if (idL.includes(q)) score = 50;

                    return { test: t, score, name };
                })
                .filter((r) => r.score > 0);

            // sort by score, then by shorter name
            scored.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.name.length - b.name.length;
            });

            // only top 30
            const limitedTests = scored.slice(0, 30).map(({ test }) => toSendableTest(test));

            socket.emit("filterTests", limitedTests);
        });

        socket.on("disconnect", () => {
            console.log("❌ UI_WS Disconnected:", socket.id);
        });
    });
}
