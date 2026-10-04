import { Router } from "express";
import { getCourses, getCoursesByCollege } from "./courses.controller.js";

const router = Router();

// GET /api/sm/v1/courses/by-college
router.get("/by-college", getCoursesByCollege);

// GET /api/sm/v1/courses
router.get("/", getCourses);

export default router;
