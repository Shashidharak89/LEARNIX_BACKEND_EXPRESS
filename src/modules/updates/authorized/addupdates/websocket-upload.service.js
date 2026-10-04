import crypto from "crypto";
import { CloudinaryService } from "../../../../common/services/cloudinary.service.js";
import { DirectUploadService } from "./direct-upload.service.js";
import { AuthorizedUpdatesService } from "../authorized-updates.service.js";
import { ApiError } from "../../../../common/utils/apiError.js";

// Session timeout: 15 minutes of inactivity before automatic cleanup
const SESSION_TTL_MS = 15 * 60 * 1000;

export class UpdateWebSocketService {
  /**
   * Active upload sessions map: sessionId -> session object
   * @type {Map<string, object>}
   */
  static sessions = new Map();

  /**
   * Initialize a new chunked upload session for an authenticated user.
   * Supports both creating a new update and editing an existing update.
   * @param {object} params
   * @param {string} params.userId
   * @param {string} [params.userRole]
   * @param {string} params.title
   * @param {string} params.content
   * @param {string[]|string} params.links
   * @param {string} params.visibility
   * @param {Array<{ fileId: string, fileName: string, totalChunks: number, fileSize?: number }>} params.files
   * @param {string|null} [params.updateId]
   * @param {Array<object>} [params.existingFiles]
   * @returns {object} Session metadata
   */
  static createSession({
    userId,
    userRole = "user",
    title,
    content,
    links = [],
    visibility = "public",
    files = [],
    updateId = null,
    existingFiles = [],
  }) {
    if (!userId) {
      throw new ApiError(401, "Authentication required to initiate upload session");
    }

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle) {
      throw new ApiError(400, "Title is required and cannot be empty");
    }

    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!trimmedContent) {
      throw new ApiError(400, "Content is required and cannot be empty");
    }

    const sessionId = `up_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Normalize files map
    const filesMap = new Map();
    let totalExpectedChunks = 0;

    if (Array.isArray(files)) {
      files.forEach((fileInfo, index) => {
        const fileId = fileInfo.fileId || `file_${index}_${crypto.randomBytes(2).toString("hex")}`;
        const fileSize = parseInt(fileInfo.fileSize, 10) || 0;
        const totalChunks = Math.max(
          1,
          parseInt(fileInfo.totalChunks, 10) || (fileSize > 0 ? Math.ceil(fileSize / (256 * 1024)) : 1)
        );
        totalExpectedChunks += totalChunks;

        filesMap.set(fileId, {
          fileId,
          fileName: fileInfo.fileName || `file_${index + 1}`,
          fileSize,
          totalChunks,
          chunksReceived: new Set(),
          chunks: new Array(totalChunks),
          uploadedToCloudinary: null,
          isCompleted: false,
        });
      });
    }

    const session = {
      sessionId,
      userId,
      userRole: userRole || "user",
      updateId: updateId ? String(updateId).trim() : null,
      existingFiles: Array.isArray(existingFiles) ? existingFiles : [],
      title: trimmedTitle,
      content: trimmedContent,
      links,
      visibility: visibility || "public",
      filesMap,
      totalExpectedChunks,
      totalReceivedChunksCount: 0,
      uploadedCloudinaryFiles: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      timer: null,
    };

    // Auto-cleanup timer if inactive
    session.timer = setTimeout(() => {
      this.cleanupSession(sessionId, true);
    }, SESSION_TTL_MS);

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      totalFiles: filesMap.size,
      totalExpectedChunks,
    };
  }

  /**
   * Process a single chunk sent by the client.
   * @param {object} params
   * @param {string} params.sessionId
   * @param {string} params.fileId
   * @param {number} params.chunkIndex - 0-indexed chunk sequence number
   * @param {number} params.totalChunks - Total chunks for this file
   * @param {string|Buffer} params.chunkData - Base64 encoded string or raw Buffer
   * @returns {Promise<{ fileProgress: number, overallProgress: number, isFileComplete: boolean, isSessionComplete: boolean, uploadedFile?: object, update?: object }>}
   */
  static async handleChunk({
    sessionId,
    fileId,
    chunkIndex,
    totalChunks,
    chunkData,
  }) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ApiError(404, `Upload session '${sessionId}' not found or has expired`);
    }

    session.lastActivityAt = Date.now();
    // Reset expiration timer on activity
    if (session.timer) clearTimeout(session.timer);
    session.timer = setTimeout(() => {
      this.cleanupSession(sessionId, true);
    }, SESSION_TTL_MS);

    const file = session.filesMap.get(fileId);
    if (!file) {
      throw new ApiError(400, `File ID '${fileId}' not recognized in session '${sessionId}'`);
    }

    const idx = parseInt(chunkIndex, 10);
    const tot = parseInt(totalChunks, 10) || file.totalChunks;

    if (isNaN(idx) || idx < 0 || idx >= tot) {
      throw new ApiError(400, `Invalid chunkIndex ${chunkIndex}. Expected 0 to ${tot - 1}`);
    }

    // Convert chunkData to Buffer
    let buffer;
    if (Buffer.isBuffer(chunkData)) {
      buffer = chunkData;
    } else if (typeof chunkData === "string") {
      let rawBase64 = chunkData;
      if (rawBase64.includes(";base64,")) {
        rawBase64 = rawBase64.split(";base64,")[1];
      }
      buffer = Buffer.from(rawBase64, "base64");
    } else {
      throw new ApiError(400, "chunkData must be a Base64 string or a Buffer");
    }

    // Store chunk buffer at index
    if (!file.chunksReceived.has(idx)) {
      file.chunksReceived.add(idx);
      session.totalReceivedChunksCount += 1;
    }
    file.chunks[idx] = buffer;

    // Calculate percentages
    const fileProgress = Math.min(100, Math.round((file.chunksReceived.size / tot) * 1000) / 10);
    const overallProgress = session.totalExpectedChunks > 0
      ? Math.min(100, Math.round((session.totalReceivedChunksCount / session.totalExpectedChunks) * 1000) / 10)
      : 100;

    let uploadedFile = null;
    let createdUpdate = null;

    // Check if this file has received all chunks
    if (file.chunksReceived.size >= tot && !file.isCompleted) {
      file.isCompleted = true;

      // Concatenate all chunks for this file safely without sparse holes
      const chunksList = [];
      for (let i = 0; i < tot; i++) {
        if (file.chunks[i]) {
          chunksList.push(file.chunks[i]);
        }
      }
      const completeBuffer = Buffer.concat(chunksList);
      // Free individual chunk references from memory
      file.chunks = [];

      // Upload assembled file to Cloudinary
      let cloudinaryResult;
      try {
        if (completeBuffer.length > 0) {
          cloudinaryResult = await CloudinaryService.uploadBuffer(completeBuffer, {
            folder: "learnix/updates",
            filename: file.fileName,
            resourceType: "auto",
          });
        } else {
          cloudinaryResult = {
            url: "",
            publicId: `empty_${file.fileId}`,
            name: file.fileName,
            resourceType: "raw",
          };
        }
      } catch (uploadErr) {
        await this.cleanupSession(sessionId, true);
        throw new ApiError(500, `Cloudinary upload failed: ${uploadErr.message}`);
      }

      uploadedFile = {
        url: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
        name: file.fileName || cloudinaryResult.name,
        resourceType: cloudinaryResult.resourceType,
      };

      file.uploadedToCloudinary = uploadedFile;
      session.uploadedCloudinaryFiles.push(uploadedFile);
    }

    // Check if entire session is ready to be committed
    const allFilesCompleted = Array.from(session.filesMap.values()).every(
      (f) => f.isCompleted && f.uploadedToCloudinary
    );

    if (allFilesCompleted) {
      // Save or update document in MongoDB
      try {
        if (session.updateId) {
          const finalFiles = [
            ...session.existingFiles,
            ...session.uploadedCloudinaryFiles,
          ];
          createdUpdate = await AuthorizedUpdatesService.updateUpdateById({
            id: session.updateId,
            userId: session.userId,
            userRole: session.userRole,
            data: {
              title: session.title,
              content: session.content,
              links: session.links,
              visibility: session.visibility,
              files: finalFiles,
            },
          });
        } else {
          createdUpdate = await DirectUploadService.createUpdate({
            userId: session.userId,
            title: session.title,
            content: session.content,
            links: session.links,
            visibility: session.visibility,
            files: session.uploadedCloudinaryFiles,
          });
        }
      } catch (dbErr) {
        await this.cleanupSession(sessionId, true);
        throw new ApiError(500, `Failed to save update to database: ${dbErr.message}`);
      }

      // Cleanup session state
      await this.cleanupSession(sessionId, false);
    }

    return {
      fileProgress,
      overallProgress,
      isFileComplete: Boolean(uploadedFile),
      isSessionComplete: Boolean(createdUpdate),
      uploadedFile,
      update: createdUpdate,
    };
  }

  /**
   * Finalize a session directly (used when no files were attached).
   * @param {string} sessionId
   */
  static async finalizeWithoutFiles(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ApiError(404, `Upload session '${sessionId}' not found`);
    }

    let resultUpdate;
    if (session.updateId) {
      resultUpdate = await AuthorizedUpdatesService.updateUpdateById({
        id: session.updateId,
        userId: session.userId,
        userRole: session.userRole,
        data: {
          title: session.title,
          content: session.content,
          links: session.links,
          visibility: session.visibility,
          files: session.existingFiles,
        },
      });
    } else {
      resultUpdate = await DirectUploadService.createUpdate({
        userId: session.userId,
        title: session.title,
        content: session.content,
        links: session.links,
        visibility: session.visibility,
        files: [],
      });
    }

    this.cleanupSession(sessionId, false);
    return resultUpdate;
  }

  /**
   * Cleanup session and optionally remove uploaded Cloudinary assets if aborted.
   * @param {string} sessionId
   * @param {boolean} deleteCloudinaryAssets - True if rolling back/aborting
   */
  static async cleanupSession(sessionId, deleteCloudinaryAssets = false) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.timer) {
      clearTimeout(session.timer);
    }

    if (deleteCloudinaryAssets && session.uploadedCloudinaryFiles.length > 0) {
      await CloudinaryService.deleteMultipleFiles(session.uploadedCloudinaryFiles);
    }

    this.sessions.delete(sessionId);
  }
}
