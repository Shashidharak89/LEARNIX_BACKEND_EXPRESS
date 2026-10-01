import { getUserFromToken } from "../../common/utils/auth.helper.js";
import { ApiError } from "../../common/utils/apiError.js";

export class UserService {
  /**
   * Retrieves profile for an authenticated user token.
   * @param {string} token
   */
  static async getCurrentUser(token) {
    if (!token) {
      throw new ApiError(401, "Authorization token is required");
    }

    const { user, error, statusCode } = await getUserFromToken(token);

    if (error || !user) {
      throw new ApiError(statusCode || 401, error || "Authentication required");
    }

    return user;
  }

  /**
   * Verifies JWT token and returns user payload & user document.
   * @param {string} token
   */
  static async verifyUserToken(token) {
    if (!token) {
      throw new ApiError(400, "Token is required for verification");
    }

    const { user, decoded, error, statusCode } = await getUserFromToken(token);

    if (error || !user) {
      throw new ApiError(statusCode || 401, error || "Invalid or expired token");
    }

    return {
      valid: true,
      user,
      decoded,
    };
  }
}

