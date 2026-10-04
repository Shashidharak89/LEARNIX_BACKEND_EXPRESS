import { Router } from "express";
import { getColleges } from "./colleges.controller.js";

const router = Router();

// GET /api/qp/v1/colleges/by-university?universityId=...
router.get("/by-university", getColleges);

// GET /api/qp/v1/colleges
router.get("/", getColleges);

export default router;
