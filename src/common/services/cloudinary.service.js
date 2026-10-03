import cloudinary from "../../config/cloudinary.js";
import { ApiError } from "../utils/apiError.js";

export class CloudinaryService {
  /**
   * Upload a memory buffer or stream to Cloudinary.
   * @param {Buffer} buffer - File buffer
   * @param {object} options - Upload options (folder, resourceType, filename, etc.)
   * @returns {Promise<{ url: string, publicId: string, name: string, resourceType: string, bytes: number }>}
   */
  static async uploadBuffer(buffer, options = {}) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new ApiError(400, "Invalid file buffer provided for Cloudinary upload");
    }

    const folder = options.folder || "learnix/updates";
    const resourceType = options.resourceType || "auto";

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          ...options,
        },
        (error, result) => {
          if (error) {
            return reject(
              new ApiError(
                500,
                `Cloudinary upload failed: ${error.message || "Unknown error"}`
              )
            );
          }

          resolve({
            url: result.secure_url || result.url,
            publicId: result.public_id,
            name: options.filename || result.original_filename || "file",
            resourceType: result.resource_type || "raw",
            bytes: result.bytes || buffer.length,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Delete a single asset from Cloudinary by public ID.
   * @param {string} publicId
   * @param {string} resourceType
   * @returns {Promise<any>}
   */
  static async deleteFile(publicId, resourceType = "raw") {
    if (!publicId) return null;
    try {
      return await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (err) {
      console.warn(`[CloudinaryService] Failed to delete ${publicId}:`, err.message);
      return null;
    }
  }

  /**
   * Delete multiple files from Cloudinary in parallel (best effort).
   * @param {Array<{ publicId: string, resourceType?: string }>} files
   */
  static async deleteMultipleFiles(files = []) {
    if (!Array.isArray(files) || files.length === 0) return;
    await Promise.allSettled(
      files
        .filter((f) => f && f.publicId)
        .map((f) => this.deleteFile(f.publicId, f.resourceType || "raw"))
    );
  }
}
