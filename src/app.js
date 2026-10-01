import express from "express";
import cors from "cors";
import updateRoutes from "./modules/updates/update.routes.js";
import resourceRoutes from "./modules/resources/resource.routes.js";
import userRoutes from "./modules/user/user.routes.js";
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

// Feature Routes
// Mount both /api/updates and /api/update to handle /api/updates/getupdates and /api/update/getupdate/:id
app.use("/api/updates", updateRoutes);
app.use("/api/update", updateRoutes);

// Resources routes: /api/resources/getresources
app.use("/api/resources", resourceRoutes);

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
