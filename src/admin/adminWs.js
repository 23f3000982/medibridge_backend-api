// ws/adminWS.ts
import { sequelize } from "../utils/postgress/postgress.js";
import { QueryTypes } from "sequelize";
import { adminData, getWithToken } from "../utils/classes/adminData.js";
import { getAllDepartments, getAllImages } from "../utils/cache/cache.js";
import { updateDepartment } from "../utils/adminFn/updateDepartment.js";

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

        socket.on("allDepartments", async () => {
            // all departments
            const allDepartments = await getAllDepartments();
            if (!allDepartments) {
                socket.emit("error", "No departments found");
                return;
            }
            socket.emit("allDepartments", allDepartments);

        });

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


        //update
        // 1. departments
        socket.on("updateDepartment", async (data) => {
            if (!data) {
                socket.emit("updateDepartmentError", {
                    success: false,
                    message: "No data provided",
                });
                return;
            }

            const updateReturn = await updateDepartment(data);

            if (!updateReturn) {
                socket.emit("updateDepartmentError", {
                    success: false,
                    message: "Failed to update department",
                });
                return;
            }

            socket.emit("departmentUpdated", {
                success: true,
                message: "Department updated successfully",
            });

            const newDepartments = await getAllDepartments(true);
            adminWS.emit("allDepartments", newDepartments);
        })


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
