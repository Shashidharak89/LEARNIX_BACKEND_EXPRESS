import { Router } from "express";
import universitiesRoutes from "./universities/universities.routes.js";
import collegesRoutes from "./colleges/colleges.routes.js";
import coursesRoutes from "./courses/courses.routes.js";
import semestersRoutes from "./semesters/semesters.routes.js";
import batchesRoutes from "./batches/batches.routes.js";
import subjectsRoutes from "./subjects/subjects.routes.js";
import filesRoutes from "./files/files.routes.js";
import treeRoutes from "../tree/tree.routes.js";
import searchRoutes from "./search/search.routes.js";

const router = Router();

// /api/sm/v1/universities
router.use("/universities", universitiesRoutes);

// /api/sm/v1/colleges (and /by-university)
router.use("/colleges", collegesRoutes);

// /api/sm/v1/courses (and /by-college)
router.use("/courses", coursesRoutes);

// /api/sm/v1/semesters (and /by-course)
router.use("/semesters", semestersRoutes);

// /api/sm/v1/batches (and /by-semester)
router.use("/batches", batchesRoutes);

// /api/sm/v1/subjects (and /by-batch)
router.use("/subjects", subjectsRoutes);

// /api/sm/v1/files (and /by-subject)
router.use("/files", filesRoutes);

// /api/sm/v1/tree/dynamic
router.use("/tree", treeRoutes);

// /api/sm/v1/search/*
router.use("/search", searchRoutes);

export default router;
