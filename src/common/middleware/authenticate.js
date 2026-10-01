import { ApiError } from "../utils/apiError.js";
import {
  extractTokenFromHeader,
  resolveUserFromToken,
} from "../utils/auth.helper.js";

/**
 * Authentication middleware that verifies JWT token from Authorization header
 * and attaches the authenticated user document to req.user.
 */
export async function authenticate(req, res, next) {
  const token = extractTokenFromHeader(req);

  if (!token) {
    return next(
      new ApiError(
        401,
        "Authorization token missing. Please provide a Bearer token in the Authorization header."
      )
    );
  }

  try {
    const { user, error, statusCode } = await resolveUserFromToken(token);

    if (error || !user) {
      return next(new ApiError(statusCode || 401, error || "Authentication failed"));
    }

    // Attach authenticated user to request
    req.user = user;
    req.token = token;
    return next();
  } catch (err) {
    return next(new ApiError(500, "Internal server error during authentication"));
  }
}
