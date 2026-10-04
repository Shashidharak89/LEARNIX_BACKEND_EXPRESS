import { PDFDocument, PageSizes } from "pdf-lib";
import { ApiError } from "../../../common/utils/apiError.js";

export class QPPdfService {
  /**
   * Generates a downloadable PDF buffer from a list of image URLs.
   */
  static async generatePdf({ images = [], fileName = "document" }) {
    if (!Array.isArray(images) || images.length === 0) {
      throw new ApiError(400, "No images provided to generate PDF");
    }

    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      if (!imageUrl || typeof imageUrl !== "string") continue;

      try {
        let imageBuffer;
        let isPng = false;

        if (imageUrl.startsWith("data:")) {
          const parts = imageUrl.split(",");
          const meta = parts[0] || "";
          const base64Data = parts[1] || "";
          isPng = meta.includes("image/png");
          imageBuffer = Buffer.from(base64Data, "base64");
        } else {
          let fetchUrl = imageUrl;
          if (fetchUrl.includes("cloudinary.com") && !fetchUrl.includes("/f_jpg/")) {
            fetchUrl = fetchUrl.replace("/upload/", "/upload/f_jpg/");
          }
          const imageResponse = await fetch(fetchUrl);
          if (!imageResponse.ok) continue;

          imageBuffer = await imageResponse.arrayBuffer();
          const contentType = imageResponse.headers.get("content-type") || "";
          isPng = contentType.includes("png") || fetchUrl.toLowerCase().includes(".png");
        }

        let image;
        if (isPng) {
          try {
            image = await pdfDoc.embedPng(imageBuffer);
          } catch (_) {
            image = await pdfDoc.embedJpg(imageBuffer);
          }
        } else {
          try {
            image = await pdfDoc.embedJpg(imageBuffer);
          } catch (_) {
            image = await pdfDoc.embedPng(imageBuffer);
          }
        }

        const page = pdfDoc.addPage(PageSizes.A4);
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const padding = 10;

        const maxWidth = pageWidth - padding * 2;
        const maxHeight = pageHeight - padding * 2;

        const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;

        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        page.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      } catch (imgError) {
        console.error(`Error processing image ${i + 1} for PDF:`, imgError);
      }
    }

    const pdfBytes = await pdfDoc.save();
    const safeFileName = `${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;

    return {
      pdfBytes: Buffer.from(pdfBytes),
      fileName: safeFileName,
    };
  }
}
