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
import { deleteTest, updateOrAddTest, updateTestStatus } from "../utils/adminFn/updateOrAddTest.js";
import { getAllTests } from "../utils/cache/tests.js";
import { getAllBanners } from "../utils/cache/homeBanner.js";
import { addOrUpdateBanner, deleteBanner } from "../utils/adminFn/addOrUpdateBanner.js";

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
        });

        //fetch all Tests
        socket.on("allTests", async (data) => {
            // Ensure it's always a boolean
            const forceFetch = !!data?.forceFetch;

            const allTests = await getAllTests(forceFetch);
            if (!allTests) {
                socket.emit("error", "No tests found");
                return;
            }
            socket.emit("allTests", allTests);
        });

        //fetch all homepage Banners
        socket.on("homeBanners", async () => {
            try {
                const banners = await getAllBanners();
                if (!banners) {
                    socket.emit("error", "No banners found");
                    return;
                }
                socket.emit("homeBanners", banners);
            } catch (error) {
                console.error("❌ Error in homeBanners event:", error);
                socket.emit("error", "Failed to fetch banners");
            }
        });

        //update
        // 1. departments
        socket.on("updateDepartment", async (data) => {
            const updateReturn = await updateDepartment(data);

            socket.emit("updateDepartment", updateReturn);
            if (!updateReturn?.success) {
                return;
            }
            const newDepartments = await getAllDepartments(true);
            adminWS.emit("allDepartments", newDepartments);
        })

        //2. Add or update Paramters
        socket.on("updateParameter", async (data) => {
            const updateReturn = await updateParameter(data);
            socket.emit("updateParameter", updateReturn);
            if (!updateReturn?.success) {
                return;
            }
            const newParameters = await getAllParameters(true);
            adminWS.emit("allParameters", newParameters);
        })
        socket.on("deleteParameter", async (data) => {
            const deleteReturn = await deleteParameter(data);
            socket.emit("deleteParameter", deleteReturn);
            if (!deleteReturn?.success) {
                return;
            }
            const newParameters = await getAllParameters(true);
            adminWS.emit("allParameters", newParameters);
        });

        //3. Add or update Sample
        socket.on("updateSample", async (data) => {
            const updateReturn = await updateOrAddSample(data);
            socket.emit("updateSample", updateReturn);
            if (!updateReturn?.success) {
                return;
            }
            const newSampleTypes = await getAllSampleType(true);
            adminWS.emit("allSampleTypes", newSampleTypes);
        });
        socket.on("deleteSample", async (data) => {
            const deleteReturn = await deleteSample(data);
            socket.emit("deleteSample", deleteReturn);
            if (!deleteReturn?.success) {
                return;
            }
            const newSampleTypes = await getAllSampleType(true);
            adminWS.emit("allSampleTypes", newSampleTypes);
        });

        // 4. Add or update the test
        socket.on("updateTestStatus", async (data) => {
            const { testId, status } = data;
            const updateReturn = await updateTestStatus(data);
            socket.emit("updateTestStatus", updateReturn);
            if (!updateReturn?.success) {
                return;
            }
            const newTests = await getAllTests(true);
            adminWS.emit("allTests", newTests);
        })
        socket.on("addOrUpdateTest", async (data) => {
            const response = await updateOrAddTest(data);
            socket.emit("addOrUpdateTest", response);

            if (response?.success) {
                const newTests = await getAllTests(true);
                adminWS.emit("allTests", newTests);
            }
        });
        socket.on("deleteTest", async (data) => {
            const { testId } = data;
            const deleteReturn = await deleteTest(data);
            socket.emit("deleteTest", deleteReturn);
            if (!deleteReturn?.success) {
                return;
            }
            const newTests = await getAllTests(true);
            adminWS.emit("allTests", newTests);
        });

        // 5. Add or update homepage banner
        socket.on("addOrUpdateBanner", async (data) => {
            const updateBannerReturn = await addOrUpdateBanner(data);
            socket.emit("addOrUpdateBanner", updateBannerReturn);
            if (!updateBannerReturn?.success) {
                return;
            }
            const newBanners = await getAllBanners(true);
            adminWS.emit("homeBanners", newBanners);
        });
        socket.on("deleteBanner", async (data) => {
            const deleteBannerReturn = await deleteBanner(data);
            socket.emit("deleteBanner", deleteBannerReturn);
            if (!deleteBannerReturn.success) {
                return;
            }
            const newBanners = await getAllBanners(true);
            adminWS.emit("homeBanners", newBanners);
        });

        //disconnect
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
