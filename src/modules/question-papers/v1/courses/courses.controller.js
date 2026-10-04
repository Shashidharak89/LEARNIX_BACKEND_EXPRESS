import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { QPCoursesService } from "./courses.service.js";

/**
 * GET /api/qp/v1/courses
 * GET /api/qp/v1/courses/by-college?collegeId=...
 */
export const getCourses = asyncHandler(async (req, res) => {
  const { collegeId, page, limit } = req.query;
  const result = await QPCoursesService.getCourses({
    collegeId,
    page,
    limit,
  });
  return res.status(200).json(result);
});

export const getCoursesByCollege = asyncHandler(async (req, res) => {
  const { collegeId, page, limit } = req.query;
  const result = await QPCoursesService.getCoursesByCollege({
    collegeId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
