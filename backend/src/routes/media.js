/**
 * Universal Media Library Routes
 * /api/media
 * 
 * Accessible by both Admins and Tenants.
 * - Tenants are scoped to their own media items (across websites and branding).
 * - Admins can view all media items or filter as needed.
 * - Uploads are automatically processed by the in-memory Image Compressor.
 */

import { Router } from "express";
import multer from "multer";
import { requireAuthenticatedUser } from "../middleware/auth.js";
import { StorageItem, MEDIA_TYPES } from "../models/StorageItem.js";
import { imagekit } from "../lib/imagekit.js";
import { compressUploadedImages } from "../middleware/imageCompressor.js";
import { parsePagination, parseSort, isMongoId, escapeRegex } from "../lib/validate.js";
import { checkStorageLimit } from "../services/limits.js";
import { resolveTenantSeoEntitlements } from "../lib/tenant-seo-entitlements.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max input (will be compressed before storage)
});

router.use(requireAuthenticatedUser);

/**
 * GET /api/media
 * Lists media items with pagination, search, and type filters.
 * Scoped automatically by caller role (tenant vs admin).
 */
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24, maxLimit: 100 });
    const sort = parseSort(req.query, ["createdAt", "size", "filename"], "createdAt:desc");
    const filter = {};

    // Role-based scoping
    if (req.user.role === "tenant") {
      filter.$or = [
        { tenant: req.user._id },
        { uploadedBy: req.user._id },
      ];
    } else if (req.query.tenant && isMongoId(req.query.tenant)) {
      filter.tenant = req.query.tenant;
    }

    if (req.query.website && isMongoId(req.query.website)) {
      filter.website = req.query.website;
    }

    if (req.query.mediaType && MEDIA_TYPES.includes(req.query.mediaType)) {
      filter.mediaType = req.query.mediaType;
    }

    if (req.query.search && typeof req.query.search === "string") {
      const q = escapeRegex(req.query.search.trim());
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { filename: { $regex: q, $options: "i" } },
          { originalName: { $regex: q, $options: "i" } },
          { alt: { $regex: q, $options: "i" } },
        ],
      });
    }

    const [items, total] = await Promise.all([
      StorageItem.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("website", "name")
        .populate("tenant", "name email")
        .lean(),
      StorageItem.countDocuments(filter),
    ]);

    return res.json({
      items: items.map(formatMediaItem),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/media/upload
 * Universal upload endpoint with automatic image compression.
 * Saves record into StorageItem for instant media library reuse.
 */
router.post(
  "/upload",
  upload.single("file"),
  compressUploadedImages("standard"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided for upload." });
      }

      // Check tenant storage limits if caller is a tenant
      if (req.user.role === "tenant") {
        const entitlements = await resolveTenantSeoEntitlements(req.user);
        const isAllowed = await checkStorageLimit(req.user._id, req.file.size, entitlements.limits);
        if (!isAllowed) {
          return res.status(403).json({
            message: `Storage limit of ${entitlements.limits.storageMb}MB reached. Please upgrade your plan or delete unused files.`,
          });
        }
      }

      const folderPath =
        req.user.role === "tenant"
          ? `/webmintra/tenants/${req.user.id}/media`
          : "/webmintra/admin/media";

      const uploadResponse = await imagekit.upload({
        file: req.file.buffer.toString("base64"),
        fileName: req.file.originalname || `media_${Date.now()}`,
        folder: folderPath,
        tags: [
          `user:${req.user.id}`,
          `role:${req.user.role}`,
          ...(req.body.tags ? String(req.body.tags).split(",") : []),
        ],
      });

      const compressionMeta = req.file.compression || {};

      const storageItem = await StorageItem.create({
        tenant: req.user.role === "tenant" ? req.user._id : undefined,
        website: req.body.websiteId && isMongoId(req.body.websiteId) ? req.body.websiteId : undefined,
        filename: uploadResponse.name || req.file.originalname,
        originalName: req.file.originalname || "",
        mimeType: req.file.mimetype || "application/octet-stream",
        mediaType: req.file.mimetype?.startsWith("image/") ? "image" : "other",
        size: uploadResponse.size ?? req.file.size,
        url: uploadResponse.url,
        path: uploadResponse.filePath || "",
        bucket: "imagekit",
        isUsed: true,
        uploadedBy: req.user._id,
        alt: req.body.alt || "",
        metadata: {
          providerFileId: uploadResponse.fileId,
          width: compressionMeta.width || uploadResponse.width || 0,
          height: compressionMeta.height || uploadResponse.height || 0,
          originalSize: compressionMeta.originalSize || req.file.size,
          compressedSize: compressionMeta.compressedSize || req.file.size,
          savedPercentage: compressionMeta.savedPercentage || 0,
        },
      });

      return res.status(201).json({
        message: "File uploaded and optimized successfully.",
        item: formatMediaItem(storageItem),
      });
    } catch (error) {
      console.error("[MEDIA UPLOAD ERROR]:", error);
      return next(error);
    }
  }
);

/**
 * DELETE /api/media/:id
 * Deletes a media item from the library.
 */
router.delete("/:id", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.id)) {
      return res.status(400).json({ message: "Invalid media item ID." });
    }

    const query = { _id: req.params.id };
    if (req.user.role === "tenant") {
      query.$or = [{ tenant: req.user._id }, { uploadedBy: req.user._id }];
    }

    const item = await StorageItem.findOne(query);
    if (!item) {
      return res.status(404).json({ message: "Media item not found or unauthorized." });
    }

    // Try deleting from ImageKit if provider fileId is available
    if (item.metadata?.providerFileId) {
      await imagekit.deleteFile(item.metadata.providerFileId).catch((e) => {
        console.warn("[MEDIA DELETE] Failed to delete from ImageKit:", e.message);
      });
    }

    await StorageItem.findByIdAndDelete(item._id);

    return res.json({ message: "Media item deleted successfully." });
  } catch (error) {
    return next(error);
  }
});

function formatMediaItem(item) {
  const meta = item.metadata || {};
  return {
    id: item._id?.toString() || item.id,
    filename: item.filename,
    originalName: item.originalName || item.filename,
    mimeType: item.mimeType,
    mediaType: item.mediaType,
    size: item.size,
    sizeKb: parseFloat((item.size / 1024).toFixed(1)),
    sizeMb: parseFloat((item.size / (1024 * 1024)).toFixed(2)),
    url: item.url,
    alt: item.alt || "",
    width: meta.width || 0,
    height: meta.height || 0,
    savedPercentage: meta.savedPercentage || 0,
    tenant: item.tenant
      ? { id: item.tenant._id?.toString(), name: item.tenant.name, email: item.tenant.email }
      : null,
    website: item.website ? { id: item.website._id?.toString(), name: item.website.name } : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export default router;
