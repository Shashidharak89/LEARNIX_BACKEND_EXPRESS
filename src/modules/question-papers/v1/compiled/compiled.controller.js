import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { QPCompiledService } from "./compiled.service.js";

/**
 * GET /api/qp/v1/compiled/groups
 */
export const getCompiledGroups = asyncHandler(async (req, res) => {
  const {
    subjectId,
    collegeId,
    courseId,
    semesterId,
    batchId,
    examTypeId,
    page,
    limit,
  } = req.query;

  const result = await QPCompiledService.getCompiledGroups({
    subjectId,
    collegeId,
    courseId,
    semesterId,
    batchId,
    examTypeId,
    page,
    limit,
  });

  return res.status(200).json(result);
});
