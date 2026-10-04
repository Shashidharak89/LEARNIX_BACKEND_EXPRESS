import { Router } from "express";
import { getCompiledGroups } from "./compiled.controller.js";

const router = Router();

// GET /api/qp/v1/compiled/groups
router.get("/groups", getCompiledGroups);

export default router;
