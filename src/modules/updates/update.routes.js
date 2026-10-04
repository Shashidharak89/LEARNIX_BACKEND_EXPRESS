import { Router } from "express";
import publicUpdatesRoutes from "./public/public-updates.routes.js";
import authorizedUpdatesRoutes from "./authorized/authorized-updates.routes.js";
import latestTitlesRoutes from "./latest-titles/latest-titles.routes.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { uploadFilesMiddleware } from "../../common/middleware/upload.js";
import {
  createUpdateDirect,
  updateUpdateById,
  deleteUpdateById,
} from "./authorized/authorized-updates.controller.js";

const router = Router();

// Authorized user updates endpoints (re
// quires Authorization header)
// Handles /api/updates/user/* and /api/updates/authorized/*
router.use("/user", authorizedUpdatesRoutes);
router.use("/authorized", authorizedUpdatesRoutes);

// Root-level authorized create update endpoints with multiple file uploads (requires Authorization header)
// POST /api/updates/upload, POST /api/updates/create, POST /api/updates
router.get("/upload", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Learnix Updates upload endpoint. Use POST with multipart/form-data for direct upload or WebSocket at /ws/updates/upload",
  });
});
router.post("/upload", authenticate, uploadFilesMiddleware, createUpdateDirect);
router.post("/create", authenticate, uploadFilesMiddleware, createUpdateDirect);
router.post("/", authenticate, uploadFilesMiddleware, createUpdateDirect);

// Root-level authorized update endpoints (requires Authorization header)
// PUT /api/updates/:id, PATCH /api/updates/:id, PUT /api/update/:id
router.put("/:id", authenticate, uploadFilesMiddleware, updateUpdateById);
router.patch("/:id", authenticate, uploadFilesMiddleware, updateUpdateById);
router.put("/update/:id", authenticate, uploadFilesMiddleware, updateUpdateById);

// Root-level authorized delete endpoints (requires Authorization header)
// DELETE /api/updates/:id, DELETE /api/update/:id, DELETE /api/updates/delete/:id
router.delete("/:id", authenticate, deleteUpdateById);
router.delete("/delete/:id", authenticate, deleteUpdateById);
router.delete("/deleteupdate/:id", authenticate, deleteUpdateById);

// Redis-cached latest titles endpoint: /api/updates/latest-titles
router.use("/", latestTitlesRoutes);

// Public updates endpoints: /api/updates/getupdates, /api/updates/getupdate/:id
router.use("/", publicUpdatesRoutes);

export default router;


