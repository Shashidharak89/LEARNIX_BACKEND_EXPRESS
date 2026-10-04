import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { SMCollegesService } from "./colleges.service.js";

/**
 * GET /api/sm/v1/colleges
 */
export const getColleges = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await SMCollegesService.getAllColleges({ page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/colleges/by-university
 */
export const getCollegesByUniversity = asyncHandler(async (req, res) => {
  const { universityId, page, limit } = req.query;
  const result = await SMCollegesService.getCollegesByUniversity({
    universityId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
