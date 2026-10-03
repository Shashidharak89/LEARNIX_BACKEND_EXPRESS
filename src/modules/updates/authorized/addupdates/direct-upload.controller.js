import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { ApiResponse } from "../../../../common/utils/apiResponse.js";
import { DirectUploadService } from "./direct-upload.service.js";

/**
 * Controller to create an update directly with multiple files attached.
 * Uploads all attached files to Cloudinary in parallel, saves metadata to DB, and returns the created update.
 * POST /api/updates
 * POST /api/updates/upload
 * POST /api/updates/user/upload
 * Header: Authorization: Bearer <jwt_token>
 * Body: multipart/form-data (title, content, links, visibility, files)
 */
export const createUpdateDirect = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { title, content, links, visibility } = req.body;
  const uploadedFiles = req.uploadedFiles || [];

  const createdUpdate = await DirectUploadService.createUpdateDirect({
    userId,
    title,
    content,
    links,
    visibility,
    uploadedFiles,
  });

  return ApiResponse.success(res, {
    statusCode: 201,
    message: "Update created and files uploaded successfully",
    data: createdUpdate,
  });
});
