// ws/adminWS.ts
import { sequelize } from "../utils/postgress/postgress.js";
import { QueryTypes } from "sequelize";
import { adminData, getWithToken } from "../utils/classes/adminData.js";
import { getAllImages } from "../utils/cache/cache.js";

const activeUsers = new Map(); // userId -> Set of tokens

export function setupAdminWS(io) {
    const adminWS = io.of("/adminWS");

    adminWS.on("connection", async (socket) => {
        const { token } = socket.handshake.auth;
        const userDetails = await getWithToken(token)
        if (!userDetails) {
            socket.disconnect();
            return;
        }
        const userId = userDetails.id;

        if (!activeUsers.has(userId)) {
            activeUsers.set(userId, new Set());
        }
        activeUsers.get(userId).add(token);

        const totalAdminCount = await adminData.allAdminCount();

        adminWS.emit("liveUsers", {
            totalUsers: totalAdminCount,
            liveUsers: activeUsers.size,
        });

        // all departments
        const allDepartments = await sequelize.query(
            `SELECT * FROM medibridge.departments`,
            { type: QueryTypes.SELECT }
        );
        if (!allDepartments) {
            socket.emit("error", "No departments found");
            return;
        }
        socket.emit("allDepartments", {
            departments: allDepartments,
        })

        // fetch all Images
        socket.on("allImages", async (data) => {
            // Ensure it's always a boolean
            const forceFetch = !!data?.forceFetch;

            const allImages = await getAllImages(forceFetch);
            if (!allImages) {
                socket.emit("error", "No images found");
                return;
            }
            socket.emit("allImages", allImages);
        });


        socket.on("disconnect", async () => {
            console.log("❌ AdminWS Disconnected:", socket.id);
            activeUsers.get(userId)?.delete(token);
            const totalAdminCount = await adminData.allAdminCount();
            adminWS.emit("liveUsers", {
                totalUsers: totalAdminCount,
                liveUsers: activeUsers.size,
            });
        });
    });
}
