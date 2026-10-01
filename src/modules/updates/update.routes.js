import { Router } from "express";
import { getUpdates, getUpdateById } from "./update.controller.js";
import latestTitlesRoutes from "./latest-titles/latest-titles.routes.js";

const router = Router();

// Sub-module route for Redis-cached latest titles: /api/updates/latest-titles
router.use("/", latestTitlesRoutes);

// GET /api/updates/getupdates?page=1&size=10&keyword=""
router.get("/getupdates", getUpdates);

// GET /api/update/getupdate/:id or /api/updates/getupdate/:id
router.get("/getupdate/:id", getUpdateById);

export default router;
