import { Router } from "express";
import {
  searchAll,
  searchUniversities,
  searchColleges,
  searchCourses,
  searchSemesters,
  searchBatches,
  searchSubjects,
  searchTree,
} from "./search.controller.js";

const router = Router();

// GET /api/sm/v1/search/all
router.get("/all", searchAll);

// GET /api/sm/v1/search/universities
router.get("/universities", searchUniversities);

// GET /api/sm/v1/search/colleges
router.get("/colleges", searchColleges);

// GET /api/sm/v1/search/courses
router.get("/courses", searchCourses);

// GET /api/sm/v1/search/semesters
router.get("/semesters", searchSemesters);

// GET /api/sm/v1/search/batches
router.get("/batches", searchBatches);

// GET /api/sm/v1/search/subjects
router.get("/subjects", searchSubjects);

// GET /api/sm/v1/search/tree
router.get("/tree", searchTree);

export default router;
