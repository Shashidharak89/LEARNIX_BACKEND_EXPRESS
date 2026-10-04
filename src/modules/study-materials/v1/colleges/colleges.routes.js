import { Router } from "express";
import { getColleges, getCollegesByUniversity } from "./colleges.controller.js";

const router = Router();

// GET /api/sm/v1/colleges/by-university
router.get("/by-university", getCollegesByUniversity);

// GET /api/sm/v1/colleges
router.get("/", getColleges);

export default router;
