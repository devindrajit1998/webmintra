/**
 * Storage Management Routes
 * /api/admin/storage
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { StorageItem, MEDIA_TYPES } from "../../models/StorageItem.js";
import { parsePagination, parseSort, isMongoId, escapeRegex } from "../../lib/validate.js";
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── List Storage Items ────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "size", "filename"]);
    const filter = {};

    if (req.query.mediaType && MEDIA_TYPES.includes(req.query.mediaType)) filter.mediaType = req.query.mediaType;
    if (req.query.tenant && isMongoId(req.query.tenant)) filter.tenant = req.query.tenant;
    if (req.query.website && isMongoId(req.query.website)) filter.website = req.query.website;
    if (req.query.isUsed === "true") filter.isUsed = true;
    if (req.query.isUsed === "false") filter.isUsed = false;

    if (req.query.search && typeof req.query.search === "string") {
      const q = escapeRegex(req.query.search.trim());
      filter.$or = [
        { filename: { $regex: q, $options: "i" } },
        { originalName: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total, stats] = await Promise.all([
      StorageItem.find(filter)
        .sort(sort).skip(skip).limit(limit)
        .populate("tenant", "name email")
        .populate("website", "name")
        .lean(),
      StorageItem.countDocuments(filter),
      StorageItem.aggregate([
        { $group: { _id: null, totalBytes: { $sum: "$size" }, usedBytes: { $sum: { $cond: ["$isUsed", "$size", 0] } }, unusedBytes: { $sum: { $cond: ["$isUsed", 0, "$size"] } }, count: { $sum: 1 } } },
      ]),
    ]);

    return res.json({
      items: items.map(formatItem),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      globalStats: stats[0] ? {
        totalBytes: stats[0].totalBytes,
        usedBytes: stats[0].usedBytes,
        unusedBytes: stats[0].unusedBytes,
        fileCount: stats[0].count,
        totalMb: Math.round(stats[0].totalBytes / (1024 * 1024)),
      } : { totalBytes: 0, usedBytes: 0, unusedBytes: 0, fileCount: 0, totalMb: 0 },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Global Storage Stats ──────────────────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    const [overall, byType, byTenant, unused] = await Promise.all([
      StorageItem.aggregate([{ $group: { _id: null, totalBytes: { $sum: "$size" }, count: { $sum: 1 } } }]),
      StorageItem.aggregate([{ $group: { _id: "$mediaType", totalBytes: { $sum: "$size" }, count: { $sum: 1 } } }]),
      StorageItem.aggregate([
        { $group: { _id: "$tenant", totalBytes: { $sum: "$size" }, count: { $sum: 1 } } },
        { $sort: { totalBytes: -1 } },
        { $limit: 10 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "tenant" } },
        { $unwind: { path: "$tenant", preserveNullAndEmpty: true } },
      ]),
      StorageItem.countDocuments({ isUsed: false }),
    ]);

    return res.json({
      overall: { totalBytes: overall[0]?.totalBytes ?? 0, count: overall[0]?.count ?? 0, totalMb: Math.round((overall[0]?.totalBytes ?? 0) / (1024 * 1024)) },
      byType,
      byTenant: byTenant.map((t) => ({ tenantId: t._id, tenantName: t.tenant?.name, bytes: t.totalBytes, files: t.count })),
      unusedFiles: unused,
    });
  } catch (error) {
    return next(error);
  }
});

// ── Cleanup unused assets ─────────────────────────────────────
router.post("/cleanup", async (req, res, next) => {
  try {
    const olderThan = req.body?.olderThanDays ?? 30;
    const cutoff = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

    const result = await StorageItem.deleteMany({
      isUsed: false,
      updatedAt: { $lte: cutoff },
    });

    return res.json({ message: `Cleaned up ${result.deletedCount} unused files.`, deletedCount: result.deletedCount });
  } catch (error) {
    return next(error);
  }
});

// ── Delete Item ───────────────────────────────────────────────
router.delete("/:itemId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.itemId)) return res.status(400).json({ message: "Invalid ID." });
    await StorageItem.findByIdAndDelete(req.params.itemId);
    return res.json({ message: "Storage item deleted." });
  } catch (error) {
    return next(error);
  }
});

// ── Live ImageKit Stats ───────────────────────────────────────
router.get("/imagekit", async (req, res, next) => {
  try {
    let totalSize = 0;
    let fileCount = 0;
    let skip = 0;
    
    while (true) {
      const files = await imagekit.listFiles({ skip, limit: 100 });
      if (!files || files.length === 0) break;
      
      fileCount += files.length;
      for (const file of files) {
        totalSize += file.size || 0;
      }
      skip += 100;
    }
    
    return res.json({
      fileCount,
      totalBytes: totalSize,
      totalMb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
    });
  } catch (error) {
    console.error("ImageKit Stats Error:", error);
    return res.status(500).json({ message: "Failed to fetch ImageKit stats." });
  }
});

function formatItem(item) {
  return {
    id: item._id,
    filename: item.filename,
    originalName: item.originalName,
    mimeType: item.mimeType,
    mediaType: item.mediaType,
    size: item.size,
    sizeMb: Math.round(item.size / (1024 * 1024) * 100) / 100,
    url: item.url,
    isUsed: item.isUsed,
    alt: item.alt,
    tenant: item.tenant ? { id: item.tenant._id, name: item.tenant.name, email: item.tenant.email } : null,
    website: item.website ? { id: item.website._id, name: item.website.name } : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export default router;
