import { JWT_SECRET } from "../../constant.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { sequelize } from "../postgress/postgress.js";
import { QueryTypes } from "sequelize";
import { AdminUser } from "../../constantTypes.js";

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes


// ✅ Type for decoded JWT
interface DecodedToken extends JwtPayload {
    adminId: number;
    username: string;
}

class AdminData {
    private allAdmins: Map<string, AdminUser>;
    private totalAdmin: { count: number; lastUpdatedAt: number };

    constructor() {
        this.allAdmins = new Map();
        this.totalAdmin = {
            count: 0,
            lastUpdatedAt: 0,
        };
    }

    async allAdminCount(): Promise<number> {
        if (Date.now() - this.totalAdmin.lastUpdatedAt > CACHE_DURATION) {
            console.log("⏳ Cache expired → fetching fresh admin count… 🔄");
            const totalAdmins = await fetchAdminsCount();
            this.totalAdmin.count = totalAdmins.total_admins ?? 0;
            this.totalAdmin.lastUpdatedAt = Date.now();
        }
        return this.totalAdmin.count;
    }

    addAdmin(adminData: AdminUser) {
        const { username } = adminData;
        if (this.allAdmins.has(username)) {
            this.allAdmins.delete(username);
        }
        this.allAdmins.set(username, adminData);
    }

    getAdminData(username: string): AdminUser | null {
        return this.allAdmins.get(username) ?? null;
    }

    allAdmin(): AdminUser[] {
        return Array.from(this.allAdmins.values());
    }
}

// ✅ Export singleton
export const adminData = new AdminData();

// --------------------
// Admin verification
// --------------------
export async function verifyAdmin(username: string, password: string): Promise<string | null> {
    if (!username || !password) return null;

    try {
        const [userVerified] = (await sequelize.query(
            `SELECT * 
             FROM medibridge.admins 
             WHERE LOWER(username) = LOWER(:username) AND password = :password`,
            {
                replacements: { username, password },
                type: QueryTypes.SELECT,
            }
        )) as any[];

        if (!userVerified) return null;

        const token = jwt.sign(
            {
                adminId: userVerified.admin_id,
                username: userVerified.username,
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

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
    } catch (error) {
        console.error("Error in verifyAdmin:", error);
        return null;
    }
}

// --------------------
// Get admin with JWT
// --------------------
export async function getWithToken(token: string): Promise<AdminUser | null> {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        if (!decoded) return null;

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
                userDetails = adminData.getAdminData(decoded.username)!;
            } else {
                return null;
            }
        }

        return userDetails;
    } catch (err) {
        console.error("Error in getWithToken:", err);
        return null;
    }
}

// --------------------
// Fetch admin from DB
// --------------------
export async function fetchFromDb(adminId: number, username: string): Promise<any | false> {
    try {
        const [userDetails] = (await sequelize.query(
            `SELECT * FROM medibridge.admins WHERE admin_id = :adminId AND LOWER(username) = LOWER(:username)`,
            {
                replacements: { adminId, username },
                type: QueryTypes.SELECT,
            }
        )) as any[];

        return userDetails ?? false;
    } catch (error) {
        console.error("Error fetching admin from DB:", error);
        return false;
    }
}

// --------------------
// Fetch total admin count
// --------------------
export async function fetchAdminsCount(): Promise<{ total_admins: number }> {
    try {
        const [totalAdmins] = (await sequelize.query(
            `SELECT COUNT(*) as total_admins FROM medibridge.admins`,
            { type: QueryTypes.SELECT }
        )) as any[];

        return totalAdmins ?? { total_admins: 0 };
    } catch (error) {
        console.error("Error fetching admin count:", error);
        return { total_admins: 0 };
    }
}
