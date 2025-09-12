import { JWT_SECRET } from "../../constant.js";
import jwt from "jsonwebtoken";
import { sequelize } from "../postgress/postgress.js";
import { QueryTypes } from "sequelize";
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
class AdminData {
    allAdmins;
    totalAdmin;
    constructor() {
        this.allAdmins = new Map();
        this.totalAdmin = {
            count: 0,
            lastUpdatedAt: 0,
        };
    }
    async allAdminCount() {
        if (Date.now() - this.totalAdmin.lastUpdatedAt > CACHE_DURATION) {
            console.log("⏳ Cache expired → fetching fresh admin count… 🔄");
            const totalAdmins = await fetchAdminsCount();
            this.totalAdmin.count = totalAdmins.total_admins ?? 0;
            this.totalAdmin.lastUpdatedAt = Date.now();
        }
        return this.totalAdmin.count;
    }
    addAdmin(adminData) {
        const { username } = adminData;
        if (this.allAdmins.has(username)) {
            this.allAdmins.delete(username);
        }
        this.allAdmins.set(username, adminData);
    }
    getAdminData(username) {
        return this.allAdmins.get(username) ?? null;
    }
    allAdmin() {
        return Array.from(this.allAdmins.values());
    }
}
// ✅ Export singleton
export const adminData = new AdminData();
// --------------------
// Admin verification
// --------------------
export async function verifyAdmin(username, password) {
    if (!username || !password)
        return null;
    try {
        const [userVerified] = (await sequelize.query(`SELECT * 
             FROM medibridge.admins 
             WHERE LOWER(username) = LOWER(:username) AND password = :password`, {
            replacements: { username, password },
            type: QueryTypes.SELECT,
        }));
        if (!userVerified)
            return null;
        const token = jwt.sign({
            adminId: userVerified.admin_id,
            username: userVerified.username,
        }, JWT_SECRET, { expiresIn: "24h" });
        adminData.addAdmin({
            adminId: userVerified.admin_id,
            username: userVerified.username,
            name: userVerified.name,
            profileImage: userVerified.profile_image,
            status: "online",
            allowed: userVerified.tests ? ["test"] : [],
            email: userVerified.email,
        });
        return token;
    }
    catch (error) {
        console.error("Error in verifyAdmin:", error);
        return null;
    }
}
// --------------------
// Get admin with JWT
// --------------------
export async function getWithToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded)
            return null;
        let userDetails = adminData.getAdminData(decoded.username);
        if (!userDetails) {
            const dbData = await fetchFromDb(decoded.adminId, decoded.username);
            if (dbData) {
                adminData.addAdmin({
                    adminId: dbData.admin_id,
                    username: dbData.username,
                    name: dbData.name,
                    profileImage: dbData.profile_image,
                    status: "online",
                    allowed: dbData.tests ? ["test"] : [],
                    email: dbData.email,
                });
                userDetails = adminData.getAdminData(decoded.username);
            }
            else {
                return null;
            }
        }
        return userDetails;
    }
    catch (err) {
        console.error("Error in getWithToken:", err);
        return null;
    }
}
// --------------------
// Fetch admin from DB
// --------------------
export async function fetchFromDb(adminId, username) {
    try {
        const [userDetails] = (await sequelize.query(`SELECT * FROM medibridge.admins WHERE admin_id = :adminId AND LOWER(username) = LOWER(:username)`, {
            replacements: { adminId, username },
            type: QueryTypes.SELECT,
        }));
        return userDetails ?? false;
    }
    catch (error) {
        console.error("Error fetching admin from DB:", error);
        return false;
    }
}
// --------------------
// Fetch total admin count
// --------------------
export async function fetchAdminsCount() {
    try {
        const [totalAdmins] = (await sequelize.query(`SELECT COUNT(*) as total_admins FROM medibridge.admins`, { type: QueryTypes.SELECT }));
        return totalAdmins ?? { total_admins: 0 };
    }
    catch (error) {
        console.error("Error fetching admin count:", error);
        return { total_admins: 0 };
    }
}
