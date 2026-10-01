import mongoose from "mongoose";
import Update from "../../models/updates/Update.js";
import User from "../../models/user/User.js";
import { ApiError } from "../../common/utils/apiError.js";

function escapeRegex(text = "") {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanKeyword(text = "") {
  if (!text || typeof text !== "string") return "";
  let cleaned = text.trim();
  // Strip enclosing quotes like "" or '' or \"\"
  cleaned = cleaned.replace(/^["']+|["']+$/g, "").trim();
  if (cleaned === "null" || cleaned === "undefined") return "";
  return cleaned;
}

export class UpdateService {
  /**
   * Fetch public updates with pagination, sorting (latest first), and optional keyword search.
   */
  static async getUpdates({ page = 1, size = 10, keyword = "" }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    // Cap max pagination size to 100 records
    const limit = Math.min(100, Math.max(1, parseInt(size, 10) || 10));
    const skip = (pageNum - 1) * limit;

    // Public visibility conditions (including legacy records where visibility was omitted)
    const visibilityCondition = {
      $or: [{ visibility: "public" }, { visibility: { $exists: false } }],
    };

    let filter = visibilityCondition;

    const trimmedKeyword = cleanKeyword(keyword);
    if (trimmedKeyword) {
      const regex = new RegExp(escapeRegex(trimmedKeyword), "i");

      // Check if keyword matches any user name or USN
      const matchedUsers = await User.find(
        { $or: [{ name: regex }, { usn: regex }] },
        { _id: 1 }
      ).lean();
      const matchedUserIds = matchedUsers.map((u) => u._id);

      const searchConditions = [
        { title: regex },
        { content: regex },
        { links: { $elemMatch: { $regex: regex } } },
        { "files.name": regex },
      ];

      if (matchedUserIds.length > 0) {
        searchConditions.push({ userId: { $in: matchedUserIds } });
      }

      filter = {
        $and: [visibilityCondition, { $or: searchConditions }],
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

    // Populate user information
    const userIds = updates.map((u) => u.userId).filter(Boolean);
    const users = await User.find(
      { _id: { $in: userIds } },
      { name: 1, usn: 1, profileimg: 1 }
    ).lean();

    const userMap = new Map();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    const enrichedUpdates = updates.map((u) => {
      const user = u.userId ? userMap.get(u.userId.toString()) : null;
      return {
        _id: u._id,
        title: u.title,
        content: u.content,
        links: u.links || [],
        files: u.files || [],
        userId: u.userId,
        visibility: u.visibility || "public",
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        author: {
          name: user?.name || null,
          usn: user?.usn || null,
          profileimg: user?.profileimg || null,
        },
      };
    });

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

  /**
   * Fetch a single update by ID with visibility allowed for public or unlisted.
   */
  static async getUpdateById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid update ID");
    }

    const update = await Update.findById(id).lean();

    if (!update) {
      throw new ApiError(404, "Update not found");
    }

    // Visibility can be either public or unlisted
    const isAllowed =
      update.visibility === "public" ||
      update.visibility === "unlisted" ||
      !update.visibility;

    if (!isAllowed) {
      throw new ApiError(404, "Update not found or is private");
    }

    // Populate user
    let author = null;
    if (update.userId) {
      const user = await User.findById(update.userId, {
        name: 1,
        usn: 1,
        profileimg: 1,
      }).lean();
      if (user) {
        author = {
          name: user.name,
          usn: user.usn,
          profileimg: user.profileimg,
        };
      }
    }

    return {
      _id: update._id,
      title: update.title,
      content: update.content,
      links: update.links || [],
      files: update.files || [],
      userId: update.userId,
      visibility: update.visibility || "public",
      createdAt: update.createdAt,
      updatedAt: update.updatedAt,
      author,
    };
  }
}
