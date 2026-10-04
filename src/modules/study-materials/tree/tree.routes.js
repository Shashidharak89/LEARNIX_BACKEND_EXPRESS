import { Router } from "express";
import { getDynamicTree } from "./tree.controller.js";

const router = Router();

// GET /api/sm/v1/tree/dynamic
router.get("/dynamic", getDynamicTree);

export default router;
