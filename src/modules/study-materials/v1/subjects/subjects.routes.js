import { Router } from "express";
import { getSubjects, getSubjectsByBatch } from "./subjects.controller.js";

const router = Router();

// GET /api/sm/v1/subjects/by-batch
router.get("/by-batch", getSubjectsByBatch);

// GET /api/sm/v1/subjects
router.get("/", getSubjects);

export default router;
