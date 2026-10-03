import mongoose from "mongoose";
import Update from "../../../../models/updates/Update.js";
import User from "../../../../models/user/User.js";
import { ApiError } from "../../../../common/utils/apiError.js";
import { CloudinaryService } from "../../../../common/services/cloudinary.service.js";

function parseLinks(links) {
  if (!links) return [];
  if (Array.isArray(links)) {
    return links
      .map((l) => (typeof l === "string" ? l.trim() : String(l).trim()))
      .filter(Boolean);
  }
  if (typeof links === "string") {
    const trimmed = links.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((l) => String(l).trim()).filter(Boolean);
        }
      } catch (e) {
        // Fallback to delimiter split
      }
    }
    return trimmed
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return [];
}

export class DirectUploadService {
  /**
   * Directly upload attached files to Cloudinary in parallel and create update document in MongoDB.
   * Cleans up uploaded Cloudinary assets if any error occurs.
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.title
   * @param {string} params.content
   * @param {string|string[]} params.links
   * @param {string} params.visibility
   * @param {Array<Express.Multer.File>} params.uploadedFiles
   */
  static async createUpdateDirect({
    userId,
    title,
    content,
    links = [],
    visibility = "public",
    uploadedFiles = [],
  }) {
    if (!userId) {
      throw new ApiError(401, "Authentication required to create update");
    }

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle) {
      throw new ApiError(400, "Title is required and cannot be empty");
    }

    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!trimmedContent) {
      throw new ApiError(400, "Content is required and cannot be empty");
    }

    const allowedVisibilities = ["public", "private", "unlisted"];
    const finalVisibility = allowedVisibilities.includes(visibility)
      ? visibility
      : "public";

    const parsedLinks = parseLinks(links);

    // Upload files to Cloudinary concurrently
    const processedFiles = [];
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

      try {
        const results = await Promise.all(uploadPromises);
        processedFiles.push(...results);
      } catch (uploadError) {
        // Rollback any successfully uploaded files to avoid orphans in Cloudinary
        if (processedFiles.length > 0) {
          await CloudinaryService.deleteMultipleFiles(processedFiles);
        }
        throw new ApiError(
          500,
          `Failed to upload attached files: ${uploadError.message}`
        );
      }
    }

    return this.createUpdate({
      userId,
      title: trimmedTitle,
      content: trimmedContent,
      links: parsedLinks,
      visibility: finalVisibility,
      files: processedFiles,
    });
  }

  /**
   * Create an update in MongoDB and invalidate cached latest titles.
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.title
   * @param {string} params.content
   * @param {string[]} params.links
   * @param {string} params.visibility
   * @param {Array<{ url: string, publicId: string, name: string, resourceType: string }>} params.files
   */
  static async createUpdate({
    userId,
    title,
    content,
    links = [],
    visibility = "public",
    files = [],
  }) {
    if (!userId) {
      throw new ApiError(401, "Authentication required to create update");
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle) {
      throw new ApiError(400, "Title is required and cannot be empty");
    }

    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!trimmedContent) {
      throw new ApiError(400, "Content is required and cannot be empty");
    }

    const allowedVisibilities = ["public", "private", "unlisted"];
    const finalVisibility = allowedVisibilities.includes(visibility)
      ? visibility
      : "public";

    const parsedLinks = parseLinks(links);

    const update = await Update.create({
      userId: userObjectId,
      title: trimmedTitle,
      content: trimmedContent,
      links: parsedLinks,
      files: Array.isArray(files) ? files : [],
      visibility: finalVisibility,
    });

    // Invalidate cached latest 3 update titles in Redis
    try {
      const { CacheService } = await import("../../../../common/services/cache.service.js");
      await CacheService.del("updates:latest_3_titles");
    } catch (e) {
      console.warn("[DirectUploadService] Cache invalidation warning:", e.message);
    }

    // Retrieve user profile to return enriched response
    const authorDoc = await User.findById(userObjectId, {
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
}
