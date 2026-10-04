import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { QPPdfService } from "./pdf.service.js";

/**
 * POST /api/work/download-pdf OR POST /api/qp/download-pdf
 * Body: { images: [...], fileName: "..." }
 */
export const downloadPdf = asyncHandler(async (req, res) => {
  const { images, fileName } = req.body || {};

  const { pdfBytes, fileName: safeFileName } = await QPPdfService.generatePdf({
    images,
    fileName,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFileName}"`
  );

  return res.status(200).send(pdfBytes);
});
