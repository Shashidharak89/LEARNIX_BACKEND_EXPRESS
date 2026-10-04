import { Router } from "express";
import { getBatches, getBatchesBySemester } from "./batches.controller.js";

const router = Router();

// GET /api/sm/v1/batches/by-semester
router.get("/by-semester", getBatchesBySemester);

// GET /api/sm/v1/batches
router.get("/", getBatches);

export default router;
