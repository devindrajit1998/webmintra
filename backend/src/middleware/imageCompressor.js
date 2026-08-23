/**
 * Express Middleware for Automated Image Compression
 * Intercepts uploaded files in `req.file` or `req.files` and compresses them in-memory
 * before passing them to the storage layer.
 */

import { compressImageBuffer } from "../services/imageCompressor.js";

/**
 * Middleware factory for auto-compressing uploaded images.
 * @param {"standard" | "branding" | "avatar" | "email" | "thumbnail" | Object} preset - Compression preset or custom options
 */
export function compressUploadedImages(preset = "standard") {
  return async (req, _res, next) => {
    try {
      // Handle single file upload: req.file
      if (req.file && Buffer.isBuffer(req.file.buffer)) {
        if (req.file.mimetype?.startsWith("image/") && req.file.mimetype !== "image/svg+xml") {
          const result = await compressImageBuffer(req.file.buffer, preset);
          if (result.isCompressed) {
            req.file.buffer = result.buffer;
            req.file.size = result.compressedSize;
            req.file.mimetype = result.mimetype;
            req.file.compression = result;
          }
        }
      }

      // Handle multiple file uploads: req.files (array or dictionary)
      if (req.files) {
        if (Array.isArray(req.files)) {
          for (const file of req.files) {
            if (file && Buffer.isBuffer(file.buffer) && file.mimetype?.startsWith("image/") && file.mimetype !== "image/svg+xml") {
              const result = await compressImageBuffer(file.buffer, preset);
              if (result.isCompressed) {
                file.buffer = result.buffer;
                file.size = result.compressedSize;
                file.mimetype = result.mimetype;
                file.compression = result;
              }
            }
          }
        } else if (typeof req.files === "object") {
          for (const field of Object.keys(req.files)) {
            const files = req.files[field];
            if (Array.isArray(files)) {
              for (const file of files) {
                if (file && Buffer.isBuffer(file.buffer) && file.mimetype?.startsWith("image/") && file.mimetype !== "image/svg+xml") {
                  const result = await compressImageBuffer(file.buffer, preset);
                  if (result.isCompressed) {
                    file.buffer = result.buffer;
                    file.size = result.compressedSize;
                    file.mimetype = result.mimetype;
                    file.compression = result;
                  }
                }
              }
            }
          }
        }
      }

      return next();
    } catch (error) {
      console.warn(`[IMAGE COMPRESSOR MIDDLEWARE] Error compressing upload, continuing with original: ${error.message}`);
      return next();
    }
  };
}
