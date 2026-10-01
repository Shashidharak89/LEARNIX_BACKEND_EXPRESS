import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { ApiResponse } from "../../common/utils/apiResponse.js";
import { UpdateService } from "./update.service.js";

/**
 * Controller to get paginated public updates.
 * GET /api/updates/getupdates?page=1&size=10&keyword=""
 */
export const getUpdates = asyncHandler(async (req, res) => {
  const { page, size, keyword, q, search } = req.query;

  const result = await UpdateService.getUpdates({
    page,
    size,
    keyword: keyword ?? q ?? search ?? "",
  });

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "Updates fetched successfully",
    data: result.updates,
    pagination: result.pagination,
  });
});

/**
 * Controller to get a single update by ID (public or unlisted).
 * GET /api/update/getupdate/:id
 */
export const getUpdateById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const update = await UpdateService.getUpdateById(id);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "Update fetched successfully",
    data: update,
  });
});
