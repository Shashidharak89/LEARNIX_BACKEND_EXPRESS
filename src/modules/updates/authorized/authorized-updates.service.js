import mongoose from "mongoose";
import Update from "../../../models/updates/Update.js";
import User from "../../../models/user/User.js";
import { ApiError } from "../../../common/utils/apiError.js";
import { CloudinaryService } from "../../../common/services/cloudinary.service.js";

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

import { DirectUploadService } from "./addupdates/direct-upload.service.js";

export class AuthorizedUpdatesService {
  /**
   * Directly upload attached files to Cloudinary and create update document in MongoDB.
   * Delegated to addupdates/direct-upload.service.js.
   */
  static async createUpdateDirect(params) {
    return DirectUploadService.createUpdateDirect(params);
  }

  /**
   * Create an update in MongoDB and invalidate cached latest titles.
   * Delegated to addupdates/direct-upload.service.js.
   */
  static async createUpdate(params) {
    return DirectUploadService.createUpdate(params);
  }

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

  /**
   * Update an update document by ID with ownership verification.
   * Only the creator or an admin/superadmin can modify the update.
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.userId
   * @param {string} params.userRole
   * @param {object} params.data
   * @param {Array<Express.Multer.File>} [params.uploadedFiles]
   */
  static async updateUpdateById({ id, userId, userRole, data = {}, uploadedFiles = [] }) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid update ID");
    }

    if (!userId) {
      throw new ApiError(401, "Authentication required to edit update");
    }

    const update = await Update.findById(id);

    if (!update) {
      throw new ApiError(404, "Update not found");
    }

    // Ownership check: user must be the author or an admin
    const isOwner = update.userId.toString() === userId.toString();
    const isAdmin = userRole === "admin" || userRole === "superadmin";

    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "Forbidden: You are not authorized to edit this update");
    }

    const { title, content, links, files, visibility, existingFiles } = data;

    // Validate visibility if provided
    if (visibility !== undefined) {
      const allowedVisibilities = ["public", "private", "unlisted"];
      if (!allowedVisibilities.includes(visibility)) {
        throw new ApiError(
          400,
          `Invalid visibility. Allowed values: ${allowedVisibilities.join(", ")}`
        );
      }
      update.visibility = visibility;
    }

    if (title !== undefined) {
      const trimmedTitle = typeof title === "string" ? title.trim() : "";
      if (!trimmedTitle) {
        throw new ApiError(400, "Title cannot be empty");
      }
      update.title = trimmedTitle;
    }

    if (content !== undefined) {
      const trimmedContent = typeof content === "string" ? content.trim() : "";
      if (!trimmedContent) {
        throw new ApiError(400, "Content cannot be empty");
      }
      update.content = trimmedContent;
    }

    if (links !== undefined) {
      if (Array.isArray(links)) {
        update.links = links
          .map((l) => (typeof l === "string" ? l.trim() : String(l).trim()))
          .filter(Boolean);
      } else if (typeof links === "string") {
        try {
          const parsed = JSON.parse(links);
          update.links = Array.isArray(parsed)
            ? parsed.map((l) => String(l).trim()).filter(Boolean)
            : [links.trim()];
        } catch {
          update.links = links
            .split(/[\n,]+/)
            .map((l) => l.trim())
            .filter(Boolean);
        }
      }
    }

    // Upload any newly attached files to Cloudinary
    let newCloudinaryFiles = [];
    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      const uploadPromises = uploadedFiles.map(async (file) => {
        const result = await CloudinaryService.uploadBuffer(file.buffer, {
          folder: "learnix/updates",
          filename: file.originalname,
          resourceType: "auto",
        });
        return {
          url: result.url,
          publicId: result.publicId,
          name: file.originalname || result.name,
          resourceType: result.resourceType,
        };
      });
      newCloudinaryFiles = await Promise.all(uploadPromises);
    }

    // Parse existing files if explicitly passed (e.g. from edit form with deleted files)
    let parsedExisting = null;
    if (existingFiles !== undefined) {
      if (Array.isArray(existingFiles)) {
        parsedExisting = existingFiles;
      } else if (typeof existingFiles === "string") {
        try {
          const parsed = JSON.parse(existingFiles);
          if (Array.isArray(parsed)) parsedExisting = parsed;
        } catch {
          parsedExisting = [];
        }
      }
    }

    if (newCloudinaryFiles.length > 0 || parsedExisting !== null) {
      const baseFiles = parsedExisting !== null ? parsedExisting : (update.files || []);
      update.files = [...baseFiles, ...newCloudinaryFiles];
    } else if (files !== undefined) {
      if (Array.isArray(files)) {
        update.files = files;
      } else if (typeof files === "string") {
        try {
          const parsed = JSON.parse(files);
          update.files = Array.isArray(parsed) ? parsed : [];
        } catch {
          update.files = [];
        }
      }
    }

    await update.save();

    // Invalidate cached latest titles if visibility or title changed
    try {
      const { CacheService } = await import("../../../common/services/cache.service.js");
      await CacheService.del("updates:latest_3_titles");
    } catch (e) {
      console.warn("[AuthorizedUpdatesService] Cache invalidation warning:", e.message);
    }

    // Fetch author info to return enriched response
    const authorDoc = await User.findById(update.userId, {
      name: 1,
      usn: 1,
      profileimg: 1,
    }).lean();

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
      author: {
        name: authorDoc?.name || null,
        usn: authorDoc?.usn || null,
        profileimg: authorDoc?.profileimg || null,
      },
    };
  }

  /**
   * Delete an update document by ID with ownership verification and file cleanup.
   * Only the creator or an admin/superadmin can delete the update.
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.userId
   * @param {string} params.userRole
   */
  static async deleteUpdateById({ id, userId, userRole }) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid update ID");
    }

    if (!userId) {
      throw new ApiError(401, "Authentication required to delete update");
    }

    const update = await Update.findById(id);

    if (!update) {
      throw new ApiError(404, "Update not found");
    }

    // Ownership check: user must be the author or an admin
    const isOwner = update.userId.toString() === userId.toString();
    const isAdmin = userRole === "admin" || userRole === "superadmin";

    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "Forbidden: You are not authorized to delete this update");
    }

    // Best-effort cleanup of associated Cloudinary files
    if (update.files && update.files.length > 0) {
      try {
        const cloudinary = (await import("../../../config/cloudinary.js")).default;
        await Promise.allSettled(
          update.files
            .filter((f) => f && f.publicId)
            .map((f) =>
              cloudinary.uploader.destroy(f.publicId, {
                resource_type: f.resourceType || "raw",
              })
            )
        );
      } catch (err) {
        console.warn("[AuthorizedUpdatesService] Cloudinary cleanup warning:", err.message);
      }
    }

    await Update.findByIdAndDelete(id);

    // Invalidate cached latest titles
    try {
      const { CacheService } = await import("../../../common/services/cache.service.js");
      await CacheService.del("updates:latest_3_titles");
    } catch (e) {
      console.warn("[AuthorizedUpdatesService] Cache invalidation warning:", e.message);
    }

    return {
      deleted: true,
      id,
      title: update.title,
    };
  }
}
