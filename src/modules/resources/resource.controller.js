import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { ApiResponse } from "../../common/utils/apiResponse.js";
import { ResourceService } from "./resource.service.js";

/**
 * Controller to get paginated public resources (formerly works).
 * GET /api/resources/getresources?page=1&size=10&keyword=""
 */
export const getResources = asyncHandler(async (req, res) => {
  const { page, size, keyword } = req.query;

  const result = await ResourceService.getResources({
    page,
    size,
    keyword,
  });

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "Resources fetched successfully",
    data: result.resources,
    pagination: result.pagination,
  });
});

/**
 * Controller to get a single resource by ID.
 * GET /api/resources/getresource/:id
 */
export const getResourceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const resource = await ResourceService.getResourceById(id);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "Resource fetched successfully",
    data: resource,
  });
});
