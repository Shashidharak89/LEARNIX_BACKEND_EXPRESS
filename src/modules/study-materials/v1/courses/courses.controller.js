import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { SMCoursesService } from "./courses.service.js";

/**
 * GET /api/sm/v1/courses
 */
export const getCourses = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await SMCoursesService.getAllCourses({ page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/courses/by-college
 */
export const getCoursesByCollege = asyncHandler(async (req, res) => {
  const { collegeId, page, limit } = req.query;
  const result = await SMCoursesService.getCoursesByCollege({
    collegeId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
