import { Router } from "express";
import subjectsRoutes from "./subjects/subjects.routes.js";
import universitiesRoutes from "./universities/universities.routes.js";
import collegesRoutes from "./colleges/colleges.routes.js";
import coursesRoutes from "./courses/courses.routes.js";
import semestersRoutes from "./semesters/semesters.routes.js";
import compiledRoutes from "./compiled/compiled.routes.js";
import imagesRoutes from "./images/images.routes.js";
import { getSubjects } from "./subjects/subjects.controller.js";

const router = Router();

// /api/qp/v1/subjects?page=1&size=20&keyword="" (Handles both initial load and search)
router.use("/subjects", subjectsRoutes);

// Legacy search alias: /api/qp/v1/search/subjects -> routes to same unified getSubjects
router.get("/search/subjects", getSubjects);

// /api/qp/v1/universities
router.use("/universities", universitiesRoutes);

// /api/qp/v1/colleges (and /by-university)
router.use("/colleges", collegesRoutes);

// /api/qp/v1/courses (and /by-college)
router.use("/courses", coursesRoutes);

// /api/qp/v1/semesters (and /by-course)
router.use("/semesters", semestersRoutes);

// /api/qp/v1/compiled/groups
router.use("/compiled", compiledRoutes);

// /api/qp/v1/images
router.use("/images", imagesRoutes);

export default router;
