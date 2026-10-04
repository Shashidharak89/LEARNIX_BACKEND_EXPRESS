import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { QPUniversitiesService } from "./universities.service.js";

/**
 * GET /api/qp/v1/universities
 */
export const getUniversities = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await QPUniversitiesService.getUniversities({ page, limit });
  return res.status(200).json(result);
});
