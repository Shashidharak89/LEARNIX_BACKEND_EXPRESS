import mongoose from "mongoose";
import Update from "../../../models/updates/Update.js";
import User from "../../../models/user/User.js";
import { ApiError } from "../../../common/utils/apiError.js";

function escapeRegex(text = "") {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanKeyword(text = "") {
  if (!text || typeof text !== "string") return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^["']+|["']+$/g, "").trim();
  if (cleaned === "null" || cleaned === "undefined") return "";
  return cleaned;
}

export class AuthorizedUpdatesService {
  /**
   * Fetch recent updates for an authenticated user considering all types of visibility (public, private, unlisted).
   * Supports pagination, sorting (latest first), and optional keyword searching.
   * @param {object} params
   * @param {string} params.userId
   * @param {number|string} params.page
   * @param {number|string} params.size
   * @param {string} params.keyword
   */
  static async getUserUpdates({ userId, page = 1, size = 10, keyword = "" }) {
    if (!userId) {
      throw new ApiError(401, "User authentication required to fetch user updates");
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(size, 10) || 10));
    const skip = (pageNum - 1) * limit;

    // Base filter: Return updates belonging to the authenticated user across ALL visibilities (public, private, unlisted)
    let filter = { userId: userObjectId };

    const trimmedKeyword = cleanKeyword(keyword);
    if (trimmedKeyword) {
      const regex = new RegExp(escapeRegex(trimmedKeyword), "i");
      filter = {
        $and: [
          { userId: userObjectId },
          {
            $or: [
              { title: regex },
              { content: regex },
              { links: { $elemMatch: { $regex: regex } } },
              { "files.name": regex },
              { visibility: regex },
            ],
          },
        ],
      };
    }

    const [total, updates] = await Promise.all([
      Update.countDocuments(filter),
      Update.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Fetch user details for author object
    const userDoc = await User.findById(userObjectId, {
      name: 1,
      usn: 1,
      profileimg: 1,
    }).lean();

    const author = {
      name: userDoc?.name || null,
      usn: userDoc?.usn || null,
      profileimg: userDoc?.profileimg || null,
    };

    const enrichedUpdates = updates.map((u) => ({
      _id: u._id,
      title: u.title,
      content: u.content,
      links: u.links || [],
      files: u.files || [],
      userId: u.userId,
      visibility: u.visibility || "public",
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      author,
    }));

    return {
      updates: enrichedUpdates,
      pagination: {
        total,
        page: pageNum,
        size: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
