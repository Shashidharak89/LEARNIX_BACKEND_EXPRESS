import { Router } from "express";
import { getFiles, getFilesBySubject } from "./files.controller.js";

const router = Router();

// GET /api/sm/v1/files/by-subject
router.get("/by-subject", getFilesBySubject);

// GET /api/sm/v1/files
router.get("/", getFiles);

export default router;
