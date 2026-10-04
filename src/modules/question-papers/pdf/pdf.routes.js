import { Router } from "express";
import { downloadPdf } from "./pdf.controller.js";

const router = Router();

// POST /api/work/download-pdf or /api/qp/download-pdf
router.post("/download-pdf", downloadPdf);

export default router;
