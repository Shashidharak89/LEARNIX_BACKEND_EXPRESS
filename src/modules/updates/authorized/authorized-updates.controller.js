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

/**
 * Controller to update an existing update by ID.
 * PUT /api/updates/:id
 * PATCH /api/updates/:id
 * Header: Authorization: Bearer <jwt_token>
 */
export const updateUpdateById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id || req.user?.id;
  const userRole = req.user?.role || "user";

  const updatedUpdate = await AuthorizedUpdatesService.updateUpdateById({
    id,
    userId,
    userRole,
    data: req.body,
  });

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "Update updated successfully",
    data: updatedUpdate,
  });
});

/**
 * Controller to delete an update by ID.
 * DELETE /api/updates/:id
 * DELETE /api/updates/delete/:id
 * Header: Authorization: Bearer <jwt_token>
 */
export const deleteUpdateById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id || req.user?.id;
  const userRole = req.user?.role || "user";

  const result = await AuthorizedUpdatesService.deleteUpdateById({
    id,
    userId,
    userRole,
  });

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "Update deleted successfully",
    data: result,
  });
});

