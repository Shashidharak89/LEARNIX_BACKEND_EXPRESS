import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { SMFilesService } from "./files.service.js";

/**
 * GET /api/sm/v1/files
 */
export const getFiles = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await SMFilesService.getAllFiles({ page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/files/by-subject
 */
export const getFilesBySubject = asyncHandler(async (req, res) => {
  const { subjectId, page, limit } = req.query;
  const result = await SMFilesService.getFilesBySubject({
    subjectId,
    page,
    limit,
  });
  return res.status(200).json(result);
});
