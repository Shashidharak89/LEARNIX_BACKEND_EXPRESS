import { Router } from "express";
import { getLegacyStudyMaterials } from "./legacy-materials.controller.js";

const router = Router();

// GET /api/study-materials
router.get("/", getLegacyStudyMaterials);

export default router;
