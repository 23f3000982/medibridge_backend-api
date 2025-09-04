// ws/adminWS.ts
import { sequelize } from "../utils/postgress/postgress.js";
import { QueryTypes } from "sequelize";
import { adminData, getWithToken } from "../utils/classes/adminData.js";
import { getAllDepartments, getAllImages } from "../utils/cache/cache.js";
import { updateDepartment } from "../utils/adminFn/updateDepartment.js";
import { getAllParameters } from "../utils/cache/parameters.js";
import { deleteParameter, updateParameter } from "../utils/adminFn/updateParameter.js";
import { getAllSampleType } from "../utils/cache/sampleType.js";
import { deleteSample, updateOrAddSample } from "../utils/adminFn/updateOrAddSample.js";

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

        // fetch all Departments
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

        //fetch all Parameters
        socket.on("allParameters", async (data) => {
            // Ensure it's always a boolean
            const forceFetch = !!data?.forceFetch;

            const allParameters = await getAllParameters(forceFetch);
            if (!allParameters) {
                socket.emit("error", "No parameters found");
                return;
            }
            socket.emit("allParameters", allParameters);
        });

        //fetch all Sample Types
        socket.on("allSampleTypes", async (data) => {
            // Ensure it's always a boolean
            const forceFetch = !!data?.forceFetch;
            const allSampleTypes = await getAllSampleType(forceFetch);
            if (!allSampleTypes) {
                socket.emit("error", "No sample types found");
                return;
            }
            socket.emit("allSampleTypes", allSampleTypes);
        }
        );

        //update
        // 1. departments
        socket.on("updateDepartment", async (data) => {
            if (!data) {
                socket.emit("updateDepartment", {
                    success: false,
                    message: "No data provided",
                });
                return;
            }

            const updateReturn = await updateDepartment(data);

            if (!updateReturn) {
                socket.emit("updateDepartment", {
                    success: false,
                    message: "Failed to update department",
                });
                return;
            }

            socket.emit("updateDepartment", {
                success: true,
                message: "Department updated successfully",
            });

            const newDepartments = await getAllDepartments(true);
            adminWS.emit("allDepartments", newDepartments);
        })

        //2. Add or update Paramters
        socket.on("updateParameter", async (data) => {
            if (!data) {
                socket.emit("updateParameter", {
                    success: false,
                    message: "No data provided",
                });
                return;
            }

            const updateReturn = await updateParameter(data);

            if (!updateReturn) {
                socket.emit("updateParameter", {
                    success: false,
                    message: "Failed to update parameter",
                });
                return;
            }

            socket.emit("updateParameter", {
                success: true,
                message: "Parameter updated successfully",
            });

            const newParameters = await getAllParameters(true);
            adminWS.emit("allParameters", newParameters);
        })
        socket.on("deleteParameter", async (data) => {
            if (!data) {
                socket.emit("deleteParameter", {
                    success: false,
                    message: "No data provided",
                });
                return;
            }

            const deleteReturn = await deleteParameter(data);
            if (!deleteReturn) {
                socket.emit("deleteParameter", {
                    success: false,
                    message: "Failed to delete parameter",
                });
                return;
            }
            socket.emit("deleteParameter", {
                success: true,
                message: "Parameter deleted successfully",
            });

            const newParameters = await getAllParameters(true);
            adminWS.emit("allParameters", newParameters);
        });

        //3. Add or update Sample
        socket.on("updateSample", async (data) => {
            if (!data) {
                socket.emit("updateSample", {
                    success: false,
                    message: "No data provided",
                });
                return;
            }

            const updateReturn = await updateOrAddSample(data);
            if (!updateReturn) {
                socket.emit("updateSample", {
                    success: false,
                    message: "Failed to update sample type",
                });
                return;
            }
            socket.emit("updateSample", {
                success: true,
                message: "Sample type updated successfully",
            });
            const newSampleTypes = await getAllSampleType(true);
            adminWS.emit("allSampleTypes", newSampleTypes);
        });
        socket.on("deleteSample", async (data) => {
            if (!data) {
                socket.emit("deleteSample", {
                    success: false,
                    message: "No data provided",
                });
                return;
            }

            const deleteReturn = await deleteSample(data);
            if (!deleteReturn) {
                socket.emit("deleteSample", {
                    success: false,
                    message: "Failed to delete sample type",
                });
                return;
            }
            socket.emit("deleteSample", {
                success: true,
                message: "Sample type deleted successfully",
            });

            const newSampleTypes = await getAllSampleType(true);
            adminWS.emit("allSampleTypes", newSampleTypes);
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
