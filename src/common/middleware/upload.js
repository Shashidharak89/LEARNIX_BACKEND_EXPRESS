import multer from "multer";
import { ApiError } from "../utils/apiError.js";

// Use memory storage to process uploads directly in RAM and stream to Cloudinary
const storage = multer.memoryStorage();

// Max single file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;
// Max number of files per request
const MAX_FILE_COUNT = 10;

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILE_COUNT,
  },
});

/**
 * Middleware for handling multiple files upload under the field name 'files' or 'file'.
 * Wraps Multer to produce standard ApiError on validation failures.
 */
export const uploadFilesMiddleware = (req, res, next) => {
  const upload = multerInstance.fields([
    { name: "files", maxCount: MAX_FILE_COUNT },
    { name: "file", maxCount: MAX_FILE_COUNT },
  ]);

  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new ApiError(400, `File too large. Maximum file size allowed is 50MB.`)
          );
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return next(
            new ApiError(
              400,
              `Too many files. Maximum allowed files per request is ${MAX_FILE_COUNT}.`
            )
          );
        }
        return next(new ApiError(400, `Multer upload error: ${err.message}`));
      }
      return next(new ApiError(400, err.message || "File upload processing error"));
    }

    // Normalize req.files to a flat array so controllers can simply inspect `req.uploadedFiles`
    const filesList = [];
    if (req.files) {
      if (Array.isArray(req.files.files)) {
        filesList.push(...req.files.files);
      }
      if (Array.isArray(req.files.file)) {
        filesList.push(...req.files.file);
      }
    } else if (Array.isArray(req.file)) {
      filesList.push(...req.file);
    } else if (req.file) {
      filesList.push(req.file);
    }

    req.uploadedFiles = filesList;
    next();
  });
};
