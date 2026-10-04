import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { SMBatchesService } from "./batches.service.js";

/**
 * GET /api/sm/v1/batches
 */
export const getBatches = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await SMBatchesService.getAllBatches({ page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/batches/by-semester
 */
export const getBatchesBySemester = asyncHandler(async (req, res) => {
  const { semesterId, courseId, collegeId, page, limit } = req.query;
  const result = await SMBatchesService.getBatchesBySemester({
    semesterId,
    courseId,
    collegeId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
