import { Router } from "express";
import v1Routes from "./v1/v1.routes.js";
import { downloadPdf } from "./pdf/pdf.controller.js";

const router = Router();

// Modular V1 APIs: /api/qp/v1/*
router.use("/v1", v1Routes);

// PDF Download: /api/qp/download-pdf
router.post("/download-pdf", downloadPdf);

export default router;
