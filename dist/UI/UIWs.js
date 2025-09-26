import { filterPackages, filterTests, frequentlyBookedPackagesList, frequentlyBookedTestsList, popularSearchPackagesList, popularSearchTestsList } from "./filterSearch.js";
export function setupUiWs(io) {
    const UI_WS = io.of("/public");
    UI_WS.on("connection", (socket) => {
        console.log("✅ UI_WS Connected:", socket.id);
        let idleTimer;
        const resetIdleTimer = () => {
            if (idleTimer)
                clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                console.log(`⚠️ Idle timeout. Disconnecting socket: ${socket.id}`);
                socket.disconnect(true);
            }, 60 * 1000); // 1 minute = 60,000 ms
        };
        // Initial timer start
        resetIdleTimer();
        // 👇 Every event resets the idle timer
        socket.onAny(() => {
            resetIdleTimer();
        });
        socket.on("getInitalSearchData", async () => {
            const popularTests = await popularSearchTestsList();
            console.log("Emitting popular tests:", popularTests.length);
            socket.emit("popularSearchTests", popularTests);
            const bookedTests = await frequentlyBookedTestsList();
            socket.emit("frequentlyBookedTests", bookedTests);
            const popularPackages = await popularSearchPackagesList();
            socket.emit("popularSearchPackages", popularPackages);
            const bookedPackages = await frequentlyBookedPackagesList();
            socket.emit("frequentlyBookedPackages", bookedPackages);
        });
        // Your existing filter listener
        socket.on("filterSearch", async (data) => {
            const { type, query } = data;
            if (!["tests", "packages"].includes(type)) {
                return socket.emit("filterTests", []);
            }
            if (type === "tests") {
                if (!query) {
                    return socket.emit("filterTests", []);
                }
                const filtered = await filterTests(query);
                socket.emit("filterTests", filtered);
            }
            if (type === "packages") {
                const filtered = await filterPackages(query);
                socket.emit("filterPackages", filtered);
            }
        });
        // On disconnect — clean up the timer
        socket.on("disconnect", () => {
            clearTimeout(idleTimer);
            console.log("❌ UI_WS Disconnected:", socket.id);
        });
    });
}
