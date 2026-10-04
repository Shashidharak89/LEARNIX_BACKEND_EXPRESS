import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { QPSemestersService } from "./semesters.service.js";

/**
 * GET /api/qp/v1/semesters
 * GET /api/qp/v1/semesters/by-course?collegeId=...&courseId=...
 */
export const getSemesters = asyncHandler(async (req, res) => {
  const { collegeId, courseId, page, limit } = req.query;
  const result = await QPSemestersService.getSemesters({
    collegeId,
    courseId,
    page,
    limit,
  });
  return res.status(200).json(result);
});

export const getSemestersByCourse = asyncHandler(async (req, res) => {
  const { collegeId, courseId, page, limit } = req.query;
  const result = await QPSemestersService.getSemestersByCourse({
    collegeId,
    courseId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
