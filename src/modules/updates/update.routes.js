import { Router } from "express";
import publicUpdatesRoutes from "./public/public-updates.routes.js";
import authorizedUpdatesRoutes from "./authorized/authorized-updates.routes.js";
import latestTitlesRoutes from "./latest-titles/latest-titles.routes.js";

const router = Router();

// Authorized user updates endpoints (requires Authorization header)
// GET /api/updates/user
// GET /api/updates/user/getupdates
// GET /api/updates/user/recent
router.use("/user", authorizedUpdatesRoutes);
router.use("/authorized", authorizedUpdatesRoutes);

// Redis-cached latest titles endpoint: /api/updates/latest-titles
router.use("/", latestTitlesRoutes);

// Public updates endpoints: /api/updates/getupdates, /api/updates/getupdate/:id
router.use("/", publicUpdatesRoutes);

export default router;

