import { Router } from "express";
import { getUniversities } from "./universities.controller.js";

const router = Router();

// GET /api/qp/v1/universities
router.get("/", getUniversities);

export default router;
