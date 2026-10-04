import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { QPCollegesService } from "./colleges.service.js";

/**
 * GET /api/qp/v1/colleges
 * GET /api/qp/v1/colleges/by-university?universityId=...
 */
export const getColleges = asyncHandler(async (req, res) => {
  const { universityId, page, limit } = req.query;
  const result = await QPCollegesService.getColleges({
    universityId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
