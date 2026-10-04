import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { SMTreeService } from "./tree.service.js";

/**
 * GET /api/sm/tree
 */
export const getFullTree = asyncHandler(async (req, res) => {
  const result = await SMTreeService.getFullTree();
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/tree/dynamic
 */
export const getDynamicTree = asyncHandler(async (req, res) => {
  const {
    level,
    universityId,
    collegeId,
    courseId,
    semesterId,
    batchId,
    subjectId,
  } = req.query;

  const result = await SMTreeService.getDynamicTree({
    level,
    universityId,
    collegeId,
    courseId,
    semesterId,
    batchId,
    subjectId,
  });

  return res.status(200).json(result);
});
