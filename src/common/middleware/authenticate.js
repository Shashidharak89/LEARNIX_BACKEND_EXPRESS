import { ApiError } from "../utils/apiError.js";
import {
  extractTokenFromHeader,
  resolveUserFromToken,
} from "../utils/auth.helper.js";
import User from "../../models/user/User.js";

/**
 * Authentication middleware that verifies JWT token from Authorization header
 * and attaches the authenticated user document to req.user.
 * Also updates the user's last login time in the database every time authentication succeeds.
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

    const now = new Date();

    // Update last login timestamp in the database whenever user is authenticated
    try {
      if (user._id) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            lastLoginAt: now,
          },
        });
        user.lastLoginAt = now;
      }
    } catch (updateErr) {
      console.warn("Failed to update last login time in authenticate middleware:", updateErr?.message || updateErr);
    }

    // Attach authenticated user to request
    req.user = user;
    req.token = token;
    return next();
  } catch (err) {
    return next(new ApiError(500, "Internal server error during authentication"));
  }
}

// Aliases for middleware naming convenience
export const verifyToken = authenticate;
export const verifyTokenMiddleware = authenticate;

