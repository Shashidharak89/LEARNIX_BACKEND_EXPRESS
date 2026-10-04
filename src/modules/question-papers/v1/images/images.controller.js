import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { QPImagesService } from "./images.service.js";

/**
 * GET /api/qp/v1/images
 */
export const getImages = asyncHandler(async (req, res) => {
  const {
    subjectId,
    collegeId,
    batchId,
    examTypeId,
    courseId,
    semesterId,
    page,
    limit,
  } = req.query;

  const result = await QPImagesService.getImages({
    subjectId,
    collegeId,
    batchId,
    examTypeId,
    courseId,
    semesterId,
    page,
    limit,
  });

  return res.status(200).json(result);
});
