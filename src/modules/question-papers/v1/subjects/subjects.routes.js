import { Router } from "express";
import { getSubjects } from "./subjects.controller.js";

const router = Router();

// GET /api/qp/v1/subjects?page=1&size=20&keyword=""
router.get("/", getSubjects);

// Alias /search for legacy clients calling /api/qp/v1/search/subjects or /api/qp/v1/subjects/search
router.get("/search", getSubjects);

export default router;
