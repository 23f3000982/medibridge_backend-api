import express from "express";
import { createServer } from "http";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { PORT } from "./constant.js";
import adminLogin from "./admin/login.js";
import { psqlConnection } from "./utils/postgress/postgress.js";
import imageHandler from "./utils/imageHandler.js";
import { Server } from 'socket.io';
import { setupAdminWS } from "./admin/adminWs.js";
import testRouter from "./uiEndpoints/tests.js";
import packageRouter from "./uiEndpoints/package.js";
import homepageRouter from "./uiEndpoints/homepage.js";
import departmentRouter from "./uiEndpoints/department.js";
import uploadImageRouter from "./admin/uploadImage.js";
import collectionCenterRouter from "./uiEndpoints/collectionCenter.js";
// import { updateBlurHash } from "./utils/irys/imageHash.js";

const app = express();
const server = createServer(app);
export const io = new Server(server, {
    cors: { origin: '*' },
    methods: ["GET", "POST"],
    credentials: true,
});

setupAdminWS(io);


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
await psqlConnection();



// admin endpoints
app.use("/images", imageHandler);
app.use("/admin/login", adminLogin)
app.use("/uploadImage", uploadImageRouter)

// UI Endpoints
app.use("/test", testRouter);
app.use("/package", packageRouter);
app.use("/department", departmentRouter);
app.use("/homepage", homepageRouter);
app.use("/collectionCenter", collectionCenterRouter);



app.get("/", async (req, res) => {
    res.json({ success: true, message: "Welcome to Medibridge" });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Method Not Allowed" });
    return;
});
// Error Handler
app.use((err, req, res, next) => {
    res.status(500).json({
        success: false,
        message: "An internal server error occurred.",
    });
    return;
});
// Start HTTP & WebSocket Server
server.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // await updateBlurHash()
});

// export default app;

process.on("unhandledRejection", (reason) => {
    console.error("🔥 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("💥 Uncaught Exception:", err);
});
