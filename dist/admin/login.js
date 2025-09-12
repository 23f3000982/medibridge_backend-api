import express from "express";
import { getWithToken, verifyAdmin } from "../utils/classes/adminData.js";
const adminLogin = express.Router();
adminLogin.use(async (req, res) => {
    // ✅ Only POST allowed
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            message: "Method not allowed",
        });
        return;
    }
    const { username, password, token } = req.body;
    if ((!username || !password) && !token) {
        res.status(400).json({
            success: false,
            message: "Bad request",
        });
        return;
    }
    // ✅ Token login
    if (token) {
        try {
            const userDetails = await getWithToken(token);
            if (!userDetails) {
                res.status(404).json({
                    success: false,
                    message: "User not found",
                });
                return;
            }
            const toSendData = {
                adminId: userDetails.adminId,
                username: userDetails.username,
                name: userDetails.name,
                profileImage: userDetails.profileImage,
                allowed: userDetails.allowed,
                email: userDetails.email,
            };
            res.status(200).json({
                success: true,
                message: "Login successful",
                user: toSendData,
            });
        }
        catch (err) {
            console.error(`Error in token verification: ${err}`);
            res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        return;
    }
    // ✅ Username/password login
    try {
        const userToken = await verifyAdmin(username, password);
        if (!userToken) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Login successful",
            token: userToken,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        return;
    }
});
export default adminLogin;
