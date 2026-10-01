import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { ApiResponse } from "../../../common/utils/apiResponse.js";
import { AuthorizedUpdatesService } from "./authorized-updates.service.js";

/**
 * Controller to fetch paginated recent updates belonging to the authenticated user (all visibilities).
 * GET /api/updates/user
 * GET /api/updates/user/getupdates
 * GET /api/user/updates
 * Header: Authorization: Bearer <jwt_token>
 */
export const getUserUpdates = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { page, size, keyword, q, search } = req.query;

  const result = await AuthorizedUpdatesService.getUserUpdates({
    userId,
    page,
    size,
    keyword: keyword ?? q ?? search ?? "",
  });

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "User updates retrieved successfully",
    data: result.updates,
    pagination: result.pagination,
  });
});
