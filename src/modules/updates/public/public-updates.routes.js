import { Router } from "express";
import { getUpdates, getUpdateById } from "./public-updates.controller.js";

const router = Router();

// GET /api/updates/getupdates
router.get("/getupdates", getUpdates);

// GET /api/update/getupdate/:id or /api/updates/getupdate/:id
router.get("/getupdate/:id", getUpdateById);

export default router;
