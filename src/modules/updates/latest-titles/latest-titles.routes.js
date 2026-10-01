import { Router } from "express";
import { getLatest3Titles } from "./latest-titles.controller.js";

const router = Router();

// GET /api/updates/latest-titles
router.get("/latest-titles", getLatest3Titles);

// Alias: /api/updates/getlatesttitles
router.get("/getlatesttitles", getLatest3Titles);

export default router;
