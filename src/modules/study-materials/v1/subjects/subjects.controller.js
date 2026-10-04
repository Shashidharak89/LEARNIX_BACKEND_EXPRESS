import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { SMSubjectsService } from "./subjects.service.js";

/**
 * GET /api/sm/v1/subjects
 */
export const getSubjects = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await SMSubjectsService.getAllSubjects({ page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/subjects/by-batch
 */
export const getSubjectsByBatch = asyncHandler(async (req, res) => {
  const { batchId, semesterId, courseId, collegeId, page, limit } = req.query;
  const result = await SMSubjectsService.getSubjectsByBatch({
    batchId,
    semesterId,
    courseId,
    collegeId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
