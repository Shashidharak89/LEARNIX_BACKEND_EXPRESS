import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { ApiResponse } from "../../common/utils/apiResponse.js";
import { extractTokenFromHeader } from "../../common/utils/auth.helper.js";
import { UserService } from "./user.service.js";

/**
 * Controller to fetch the currently authenticated user's information.
 * GET /api/user/me
 * Header: Authorization: Bearer <jwt_token>
 */
export const getMe = asyncHandler(async (req, res) => {
  let user = req.user;

  if (!user) {
    const token = extractTokenFromHeader(req);
    user = await UserService.getCurrentUser(token);
  }

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "User profile retrieved successfully",
    data: { user },
  });
});

/**
 * Controller to verify JWT token and return authenticated user details.
 * GET/POST /api/user/verify
 * Header: Authorization: Bearer <jwt_token> OR Body: { token: "..." }
 */
export const verifyUser = asyncHandler(async (req, res) => {
  const token = extractTokenFromHeader(req);
  const result = await UserService.verifyUserToken(token);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: "User verified successfully",
    data: result,
  });
});

