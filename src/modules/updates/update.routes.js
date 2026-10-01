import { Router } from "express";
import publicUpdatesRoutes from "./public/public-updates.routes.js";
import authorizedUpdatesRoutes from "./authorized/authorized-updates.routes.js";
import latestTitlesRoutes from "./latest-titles/latest-titles.routes.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import {
  updateUpdateById,
  deleteUpdateById,
} from "./authorized/authorized-updates.controller.js";

const router = Router();

// Authorized user updates endpoints (requires Authorization header)
// Handles /api/updates/user/* and /api/updates/authorized/*
router.use("/user", authorizedUpdatesRoutes);
router.use("/authorized", authorizedUpdatesRoutes);

// Root-level authorized update endpoints (requires Authorization header)
// PUT /api/updates/:id, PATCH /api/updates/:id, PUT /api/update/:id
router.put("/:id", authenticate, updateUpdateById);
router.patch("/:id", authenticate, updateUpdateById);
router.put("/update/:id", authenticate, updateUpdateById);

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


