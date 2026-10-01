import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { ApiResponse } from "../../../common/utils/apiResponse.js";
import { LatestTitlesService } from "./latest-titles.service.js";

/**
 * Controller to get the last 3 update titles cached in Redis for 30 minutes.
 * GET /api/updates/latest-titles
 */
export const getLatest3Titles = asyncHandler(async (req, res) => {
  const result = await LatestTitlesService.getLatest3Titles();

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "Latest 3 update titles fetched successfully",
    data: result.titles,
    extra: {
      updates: result.updates,
      source: result.source,
      cachedDurationMinutes: result.cachedDurationMinutes,
    },
  });
});
