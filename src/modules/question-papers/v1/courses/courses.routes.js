import { Router } from "express";
import { getCourses, getCoursesByCollege } from "./courses.controller.js";

const router = Router();

// GET /api/qp/v1/courses/by-college?collegeId=...
router.get("/by-college", getCoursesByCollege);

// GET /api/qp/v1/courses
router.get("/", getCourses);

export default router;
