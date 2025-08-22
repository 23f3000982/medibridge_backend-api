import { getWithToken } from "../classes/adminData";

export async function verifyAdmin(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "No token provided" });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ error: "Malformed token" });
    }

    const token = parts[1];

    try {
        const decoded = getWithToken(token);
        if (!decoded) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

}
