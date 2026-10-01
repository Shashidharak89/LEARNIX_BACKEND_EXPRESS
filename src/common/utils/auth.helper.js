import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import User from "../../models/user/User.js";

/**
 * Gets the JWT secret key from environment variables.
 * @returns {string}
 */
export function getJwtSecret() {
  return env.SECRET_KEY || env.JWT_SECRET || process.env.SECRET_KEY || process.env.JWT_SECRET || "mysecretkey@learnix";
}

/**
 * Extracts Bearer token from Express Request headers, body, or query parameters.
 * @param {import("express").Request} req
 * @returns {string|null}
 */
export function extractTokenFromHeader(req) {
  if (!req) return null;

  // 1. Check Authorization header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;

  if (authHeader && typeof authHeader === "string") {
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim() || null;
  }

  // 2. Check request body
  if (req.body?.token && typeof req.body.token === "string") {
    return req.body.token.trim();
  }
  if (req.body?.jwt && typeof req.body.jwt === "string") {
    return req.body.jwt.trim();
  }
  if (req.body?.accessToken && typeof req.body.accessToken === "string") {
    return req.body.accessToken.trim();
  }

  // 3. Check query parameters
  if (req.query?.token && typeof req.query.token === "string") {
    return req.query.token.trim();
  }
  if (req.query?.jwt && typeof req.query.jwt === "string") {
    return req.query.jwt.trim();
  }

  return null;
}

/**
 * Alias for extractTokenFromHeader for convenience.
 */
export const extractToken = extractTokenFromHeader;

/**
 * Verifies a JWT token using SECRET_KEY.
 * @param {string} token
 * @returns {{ valid: boolean, decoded?: any, error?: string, expired?: boolean }}
 */
export function verifyJwtToken(token) {
  if (!token) {
    return { valid: false, error: "No token provided" };
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    return { valid: true, decoded };
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return { valid: false, error: "Token has expired", expired: true };
    }
    return { valid: false, error: err.message || "Invalid token" };
  }
}

/**
 * Resolves user document from database using a JWT token.
 * Extracts userId, usn, or email from token payload and queries DB.
 * Excludes sensitive fields like password.
 * @param {string} token
 * @returns {Promise<{ user: any, decoded?: any, valid: boolean, error?: string, statusCode?: number }>}
 */
export async function getUserFromToken(token) {
  const verification = verifyJwtToken(token);

  if (!verification.valid) {
    return {
      user: null,
      valid: false,
      error: verification.error || "Invalid or expired token",
      statusCode: 401,
    };
  }

  const { decoded } = verification;
  const userId = decoded?.userId || decoded?.id || decoded?._id || decoded?.sub;
  const usn = decoded?.usn;
  const email = decoded?.email;

  let user = null;

  // 1. Search by User ID if valid ObjectId
  if (userId && (typeof userId === "string" || userId instanceof mongoose.Types.ObjectId)) {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId).select("-password").lean();
    }
  }

  // 2. Fallback: Search by USN if present in token payload
  if (!user && usn) {
    user = await User.findOne({ usn }).select("-password").lean();
  }

  // 3. Fallback: Search by Email if present in token payload
  if (!user && email) {
    user = await User.findOne({ email }).select("-password").lean();
  }

  // 4. Fallback: Search by saved token field on User document
  if (!user && token) {
    user = await User.findOne({ token }).select("-password").lean();
  }

  if (!user) {
    return {
      user: null,
      decoded,
      valid: false,
      error: "User not found or account removed",
      statusCode: 404,
    };
  }

  return {
    user,
    decoded,
    valid: true,
    error: null,
  };
}

/**
 * Resolves user from Express Request object.
 * @param {import("express").Request} req
 * @returns {Promise<{ user: any, token: string|null, decoded?: any, valid: boolean, error?: string, statusCode?: number }>}
 */
export async function getUserFromRequest(req) {
  const token = extractTokenFromHeader(req);
  if (!token) {
    return {
      user: null,
      token: null,
      valid: false,
      error: "Authorization token missing",
      statusCode: 401,
    };
  }

  const result = await getUserFromToken(token);
  return {
    ...result,
    token,
  };
}

/**
 * Backwards compatible function alias for getUserFromToken.
 */
export const resolveUserFromToken = getUserFromToken;

/**
 * Generates a signed JWT token for a user.
 * @param {string|object} payload String userId or payload object
 * @param {string} expiresIn Token expiration (default "30d")
 * @returns {string}
 */
export function generateToken(payload, expiresIn = "30d") {
  const secret = getJwtSecret();
  const tokenPayload = typeof payload === "string" ? { userId: payload } : payload;
  return jwt.sign(tokenPayload, secret, { expiresIn });
}

