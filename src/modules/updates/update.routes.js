import { Router } from "express";
import { getUpdates, getUpdateById } from "./update.controller.js";

const router = Router();

// GET /api/updates/getupdates?page=1&size=10&keyword=""
router.get("/getupdates", getUpdates);

// GET /api/update/getupdate/:id or /api/updates/getupdate/:id
router.get("/getupdate/:id", getUpdateById);

export default router;
