import express from "express";
import cors from "cors";
import updateRoutes from "./modules/updates/update.routes.js";
import resourceRoutes from "./modules/resources/resource.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import smRoutes from "./modules/study-materials/study-materials.routes.js";
import legacyStudyMaterialsRoutes from "./modules/study-materials/legacy/legacy-materials.routes.js";
import { errorHandler } from "./common/middleware/errorHandler.js";
import { ApiError } from "./common/utils/apiError.js";

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// WebSocket endpoints HTTP informational status
app.get(["/ws/updates/upload", "/ws/updates", "/api/updates/ws"], (req, res) => {
  res.status(200).json({
    success: true,
    message: "Learnix Updates WebSocket upload endpoint. Connect using WebSocket protocol (ws:// or wss://).",
    timestamp: new Date().toISOString(),
  });
});

// Feature Routes
// Mount both /api/updates and /api/update to handle /api/updates/getupdates and /api/update/getupdate/:id
app.use("/api/updates", updateRoutes);
app.use("/api/update", updateRoutes);

// Resources routes: /api/resources/getresources
app.use("/api/resources", resourceRoutes);

// Study Materials routes: /api/study-materials, /api/sm/tree, /api/sm/v1/*
app.use("/api/study-materials", legacyStudyMaterialsRoutes);
app.use("/api/sm", smRoutes);

// User & Auth routes: /api/user/me, /api/auth/me, /api/me
app.use("/api/user", userRoutes);
app.use("/api/auth", userRoutes);
app.use("/api", userRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// Central Error Handling Middleware
app.use(errorHandler);

export default app;
