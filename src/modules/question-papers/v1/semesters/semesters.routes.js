import { Router } from "express";
import { getSemesters, getSemestersByCourse } from "./semesters.controller.js";

const router = Router();

// GET /api/qp/v1/semesters/by-course?collegeId=...&courseId=...
router.get("/by-course", getSemestersByCourse);

// GET /api/qp/v1/semesters
router.get("/", getSemesters);

export default router;
