import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { SMSemestersService } from "./semesters.service.js";

/**
 * GET /api/sm/v1/semesters
 */
export const getSemesters = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await SMSemestersService.getAllSemesters({ page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/semesters/by-course
 */
export const getSemestersByCourse = asyncHandler(async (req, res) => {
  const { courseId, collegeId, page, limit } = req.query;
  const result = await SMSemestersService.getSemestersByCourse({
    courseId,
    collegeId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
