import { JWT_SECRET } from "../../constant.js";
import { sequelize } from "../postgress/postgress.js";
import jwt from "jsonwebtoken";


const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

class AdminData {
    constructor() {
        // this.adminInfo = {
        //     username: null,
        //     name: null,
        //     allowed: [],
        //     profileImage: null,
        //     status: null,
        //     email: null
        // };
        this.allAdmins = new Map();
        this.totalAdmin = {
            count: 0,
            lastUpdatedAt: 0
        }
    }

    async allAdminCount() {
        if (Date.now() - this.totalAdmin.lastUpdatedAt > CACHE_DURATION) {
            console.log("⏳ Cache expired → fetching fresh admin count… 🔄");
            const totalAdmins = await fetchAdminsCount();
            this.totalAdmin.count = totalAdmins.total_admins;
            this.totalAdmin.lastUpdatedAt = Date.now();
        }
        return this.totalAdmin.count;
    }


    addAdmin(adminData) {
        const { id, username, name, profileImage, sessionToken, allowed, status, email } = adminData;
        if (this.allAdmins.has(username)) {
            this.allAdmins.delete(username);
        }
        this.allAdmins.set(username, {
            id,
            username,
            name,
            profileImage,
            sessionToken,
            allowed,
            status,
            email
        });
    }

    getAdminData(username) {
        if (this.allAdmins.has(username)) {
            return this.allAdmins.get(username);
        }
        return null;
    }

    allAdmin() {
        return Array.from(this.allAdmins.values());
    }

}

// Example usage:
export const adminData = new AdminData();

export async function verifyAdmin(username, password) {
    if (!username || !password) {
        return false;
    }

    try {
        const [userVerified] = await sequelize.query(
            `SELECT * FROM admins WHERE LOWER(username) = LOWER(:username) AND password = :password`,
            {
                replacements: { username, password },
                type: sequelize.QueryTypes.SELECT
            });

        if (!userVerified) {
            return false;
        }
        const token = jwt.sign(
            {
                id: userVerified.id,
                username: userVerified.username,
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        adminData.addAdmin({
            id: userVerified.id,
            username: userVerified.username,
            name: userVerified.name,
            profileImage: userVerified.profile_image,
            status: "online",
            allowed: [userVerified.tests && "test"],
            email: userVerified.email
        });
        return token;
    } catch (error) {
        return false
    }

}

export async function getWithToken(token) {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded) {
        return false;
    }

    const userDetails = adminData.getAdminData(decoded.username);
    if (!userDetails) {
        const dbData = await fetchFromDb(decoded.id, decoded.username);
        if (dbData) {
            adminData.addAdmin({
                id: dbData.id,
                username: dbData.username,
                name: dbData.name,
                profileImage: dbData.profile_image,
                status: "online",
                allowed: [dbData.tests && "test"],
                email: dbData.email
            });
            return dbData;
        }
        else {
            return false;
        }
    }

    return userDetails;
}


export async function fetchFromDb(id, username) {
    try {
        const [userDetails] = await sequelize.query(
            `SELECT * FROM admins WHERE id = :id AND LOWER(username) = LOWER(:username)`,
            {
                replacements: { id, username },
                type: sequelize.QueryTypes.SELECT
            });
        if (!userDetails) {
            return false;
        }
        return userDetails;
    } catch (error) {
        return false;
    }
}

export async function fetchAdminsCount() {
    try {
        const [totalAdmins] = await sequelize.query(
            `SELECT COUNT(*) as total_admins FROM medibridge.admins`,
            { type: sequelize.QueryTypes.SELECT }
        );
        if (!totalAdmins) {
            return 0;
        }
        return totalAdmins;
    } catch (error) {
        console.error("Error fetching admin count:", error);
        return 0;
    }
}