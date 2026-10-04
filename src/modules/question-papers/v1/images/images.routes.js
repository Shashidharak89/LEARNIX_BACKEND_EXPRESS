import { Router } from "express";
import { getImages } from "./images.controller.js";

const router = Router();

// GET /api/qp/v1/images
router.get("/", getImages);

export default router;
