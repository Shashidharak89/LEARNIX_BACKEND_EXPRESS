import { Router } from "express";
import { getResources, getResourceById } from "./resource.controller.js";

const router = Router();

// GET /api/resources/getresources?page=1&size=10&keyword=""
router.get("/getresources", getResources);

// GET /api/resources/getresource/:id
router.get("/getresource/:id", getResourceById);

export default router;
