import { adminData, getWithToken } from "../utils/classes/adminData.js";
import { getAllBanners, getAllDepartments, getAllImages, getAllPackages, getAllParameters, getAllSamples, getAllTests, getPopularTests } from "../utils/cache/cache.js";
import { updateDepartment } from "../utils/adminFn/updateDepartment.js";
import { deleteSample, updateOrAddSample } from "../utils/adminFn/updateOrAddSample.js";
import { deleteParameter, updateParameter } from "../utils/adminFn/updateParameter.js";
import { deleteTest, updateTest } from "../utils/adminFn/updateOrAddTest.js";
import { deletePackage, updatePackage, updateSubPackage } from "../utils/adminFn/updatePackage.js";
import { deleteBanner, UpdateBanner } from "../utils/adminFn/updateBanner.js";
import { updatePopularTest } from "../utils/adminFn/updatePopularTest.js";
const activeUsers = new Map(); // userId -> Set of tokens
export function setupAdminWS(io) {
    const adminWS = io.of("/adminWS");
    adminWS.on("connection", async (socket) => {
        const { token } = socket.handshake.auth;
        const userDetails = await getWithToken(token);
        if (!userDetails) {
            socket.disconnect();
            return;
        }
        const userId = userDetails.adminId;
        if (!activeUsers.has(userId)) {
            activeUsers.set(userId, new Set());
        }
        activeUsers.get(userId).add(token);
        const totalAdminCount = await adminData.allAdminCount();
        adminWS.emit("liveUsers", {
            totalUsers: totalAdminCount,
            liveUsers: activeUsers.size,
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
        //fetch all Sample Types
        socket.on("allSamples", async (data) => {
            // Ensure it's always a boolean
            const forceFetch = !!data?.forceFetch;
            const allSamples = await getAllSamples(forceFetch);
            if (!allSamples) {
                socket.emit("error", "No sample types found");
                return;
            }
            socket.emit("allSamples", allSamples);
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
        //fetch all Packages
        socket.on("allPackages", async (data) => {
            // Ensure it's always a boolean
            const forceFetch = !!data?.forceFetch;
            const allPackages = await getAllPackages(forceFetch);
            if (!allPackages) {
                socket.emit("error", "No packages found");
                return;
            }
            socket.emit("allPackages", allPackages);
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
            }
            catch (error) {
                console.error("❌ Error in homeBanners event:", error);
                socket.emit("error", "Failed to fetch banners");
            }
        });
        //fetch popular Tests
        socket.on("popularTests", async () => {
            const popularTests = await getPopularTests();
            if (!popularTests) {
                socket.emit("error", "No popular tests found");
                return;
            }
            socket.emit("popularTests", popularTests);
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
            console.log(newDepartments);
            adminWS.emit("allDepartments", newDepartments);
        });
        //2. Add or update Sample
        socket.on("updateSample", async (data) => {
            const updateReturn = await updateOrAddSample(data);
            socket.emit("updateSample", updateReturn);
            if (!updateReturn?.success) {
                return;
            }
            const newSamples = await getAllSamples(true);
            adminWS.emit("allSamples", newSamples);
        });
        socket.on("deleteSample", async (data) => {
            const deleteReturn = await deleteSample(data);
            socket.emit("deleteSample", deleteReturn);
            if (!deleteReturn?.success) {
                return;
            }
            const newSamples = await getAllSamples(true);
            adminWS.emit("allSamples", newSamples);
        });
        //3. Add or update Parameters
        socket.on("updateParameter", async (data) => {
            const updateReturn = await updateParameter(data);
            socket.emit("updateParameter", updateReturn);
            if (!updateReturn?.success) {
                return;
            }
            const newParameters = await getAllParameters(true);
            adminWS.emit("allParameters", newParameters);
        });
        socket.on("deleteParameter", async (data) => {
            const deleteReturn = await deleteParameter(data);
            socket.emit("deleteParameter", deleteReturn);
            if (!deleteReturn?.success) {
                return;
            }
            const newParameters = await getAllParameters(true);
            adminWS.emit("allParameters", newParameters);
        });
        // 4. Add or update the test
        socket.on("updateTest", async (data) => {
            const response = await updateTest(data);
            socket.emit("updateTest", response);
            if (response?.success) {
                const newTests = await getAllTests(true);
                adminWS.emit("allTests", newTests);
            }
        });
        socket.on("deleteTest", async (data) => {
            const deleteReturn = await deleteTest(data);
            socket.emit("deleteTest", deleteReturn);
            if (!deleteReturn?.success) {
                return;
            }
            const newTests = await getAllTests(true);
            adminWS.emit("allTests", newTests);
        });
        //5. Handle all Packages
        socket.on("updatePackage", async (data) => {
            const updatePackageReturn = await updatePackage(data);
            socket.emit("updatePackage", updatePackageReturn);
            if (!updatePackageReturn?.success) {
                return;
            }
            // Optionally, you can emit an event to refresh package lists if you have such a cache
            const newPackages = await getAllPackages(true);
            adminWS.emit("allPackages", newPackages);
        });
        socket.on("deletePackage", async (data) => {
            const dltPkgReturn = await deletePackage(data);
            socket.emit("deletePackage", dltPkgReturn);
            if (!dltPkgReturn?.success) {
                return;
            }
            const newPackages = await getAllPackages(true);
            adminWS.emit("allPackages", newPackages);
        });
        // 5.1 Handle subpackage
        socket.on("updateSubPackage", async (data) => {
            const updateSubPackageReturn = await updateSubPackage(data);
            socket.emit("updateSubPackage", updateSubPackageReturn);
            if (!updateSubPackageReturn?.success) {
                return;
            }
            const newSubPackages = await getAllPackages(true);
            adminWS.emit("allPackages", newSubPackages);
        });
        // 6. Add or update homepage banner
        socket.on("updateBanner", async (data) => {
            const updateBannerReturn = await UpdateBanner(data);
            socket.emit("updateBanner", updateBannerReturn);
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
        //7. Handle update popularTest chnage
        socket.on("savePopularTests", async (data) => {
            const populrTestReturn = await updatePopularTest(data);
            socket.emit("savePopularTests", populrTestReturn);
            if (!populrTestReturn?.success) {
                return;
            }
            const newPopularTests = await getPopularTests(true);
            adminWS.emit("popularTests", newPopularTests);
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
