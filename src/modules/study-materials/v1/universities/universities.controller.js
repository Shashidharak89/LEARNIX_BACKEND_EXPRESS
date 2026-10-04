import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { SMUniversitiesService } from "./universities.service.js";

/**
 * GET /api/sm/v1/universities
 */
export const getUniversities = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await SMUniversitiesService.getUniversities({ page, limit });
  return res.status(200).json(result);
});
