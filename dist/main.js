import express from "express";
import { createServer } from "http";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { Server } from "socket.io";
import { PORT } from "./constant.js";
import { psqlConnection } from "./utils/postgress/postgress.js";
import adminLogin from "./admin/login.js";
import imageHandler from "./uiEndpoints/imageHandler.js";
import uploadImageRouter from "./admin/uploadImage.js";
import { setupAdminWS } from "./admin/adminWs.js";
import testRouter from "./uiEndpoints/tests.js";
import homepageRouter from "./uiEndpoints/homeBanner.js";
import departmentRouter from "./uiEndpoints/department.js";
import collectionCenterRouter from "./uiEndpoints/collectionCenter.js";
import popularTestRouter from "./uiEndpoints/popularTests.js";
import PopularPackagesRouter from "./uiEndpoints/popularPackages.js";
// import { updateBlurHash } from "./utils/irys/imageHash";
// create express app and HTTP server
const app = express();
const server = createServer(app);
// socket.io
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"], // ✅ moved inside cors
        credentials: true,
    },
});
setupAdminWS(io);
// middleware
app.set("trust proxy", true);
app.use(morgan("common", { skip: (req) => req.url === "/favicon.ico" }));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "x-action-type"],
    credentials: true,
}));
// connect to PostgreSQL
await psqlConnection();
// admin endpoints
app.use("/admin/login", adminLogin);
app.use("/images", imageHandler);
app.use("/uploadImage", uploadImageRouter);
// UI Endpoints
app.use("/homeBanners", homepageRouter);
app.use("/popularTests", popularTestRouter);
app.use("/popularPackages", PopularPackagesRouter);
app.use("/test", testRouter);
app.use("/department", departmentRouter);
app.use("/collectionCenter", collectionCenterRouter);
// root endpoint
app.get("/", async (req, res) => {
    res.json({ success: true, message: "Welcome to Medibridge" });
});
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Method Not Allowed" });
});
// Error Handler
app.use((err, req, res, next) => {
    console.error("💥 Error:", err);
    res.status(500).json({
        success: false,
        message: "An internal server error occurred.",
    });
});
// Start server
server.listen(PORT, async () => {
    // await updateBlurHash();
    console.log(`Server is running on http://localhost:${PORT}`);
});
// global error handling
process.on("unhandledRejection", (reason) => {
    console.error("🔥 Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("💥 Uncaught Exception:", err);
});
