import { Router } from "express";
import v1Routes from "./v1/v1.routes.js";
import { getFullTree } from "./tree/tree.controller.js";

const router = Router();

// Full tree: GET /api/sm/tree
router.get("/tree", getFullTree);

// V1 Modular APIs: /api/sm/v1/*
router.use("/v1", v1Routes);

export default router;
