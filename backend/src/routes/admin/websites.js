/**
 * Website Management Routes (Admin Read/Manage — NO content editing)
 * /api/admin/websites
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Website } from "../../models/Website.js";
import { User } from "../../models/User.js";
import { Domain } from "../../models/Domain.js";
import { StorageItem } from "../../models/StorageItem.js";
import { Template } from "../../models/Template.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, escapeRegex } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── List Websites ─────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "updatedAt", "name"]);
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.owner && isMongoId(req.query.owner)) filter.owner = req.query.owner;

    if (req.query.search && typeof req.query.search === "string") {
      const q = escapeRegex(req.query.search.trim());
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { templateName: { $regex: q, $options: "i" } },
      ];
    }

    const [websites, total] = await Promise.all([
      Website.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("owner", "name email business tenantStatus")
        .lean(),
      Website.countDocuments(filter),
    ]);

    return res.json({
      websites: websites.map(formatWebsite),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Get Website Detail ────────────────────────────────────────
router.get("/:websiteId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.websiteId))
      return res.status(400).json({ message: "Invalid website ID." });

    const website = await Website.findById(req.params.websiteId)
      .populate("owner", "name email business tenantStatus plan")
      .lean();

    if (!website) return res.status(404).json({ message: "Website not found." });

    const [domains, storageItems] = await Promise.all([
      Domain.find({ website: website._id }).select("domain status sslStatus isPrimary").lean(),
      StorageItem.find({ website: website._id }).lean(),
    ]);

    const storageTotalBytes = storageItems.reduce((acc, s) => acc + s.size, 0);

    return res.json({
      website: {
        ...formatWebsite(website),
        domains: domains.map((d) => ({ id: d._id, domain: d.domain, status: d.status, sslStatus: d.sslStatus, isPrimary: d.isPrimary })),
        storage: {
          totalBytes: storageTotalBytes,
          totalMb: Math.round(storageTotalBytes / (1024 * 1024)),
          fileCount: storageItems.length,
          byType: groupByType(storageItems),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Get Website Editor Data (Admin Testing) ───────────────────
router.get("/:websiteId/editor", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.websiteId))
      return res.status(400).json({ message: "Invalid website ID." });

    const website = await Website.findById(req.params.websiteId)
      .populate("templateId", "htmlContent pages")
      .populate("owner", "name email plan");

    if (!website) return res.status(404).json({ message: "Website not found." });

    const htmlContent = website.templateId?.htmlContent || "";
    const pages = website.templateId?.pages || [];

    return res.json({
      website: {
        id: website.id || website._id?.toString(),
        name: website.name,
        templateName: website.templateName,
        templateId: website.templateId,
        status: website.status,
        lastOpenedAt: website.lastOpenedAt,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt,
        draftState: website.draftState,
        publishedState: website.publishedState,
        owner: website.owner,
      },
      htmlContent,
      pages,
      seoEntitlements: {
        limits: { websites: 999, pagesPerWebsite: 999, storageMb: 9999 },
        seoFeatures: {
          metaTitleDescription: true,
          socialSharePreviews: true,
          sitemapGeneration: true,
          searchConsoleVerification: true,
          googleAnalyticsIntegration: true,
          custom301Redirects: true,
          custom404Page: true,
          imageAltText: "enabled",
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Save Website Draft (Admin Testing) ─────────────────────────
router.put("/:websiteId/draft", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.websiteId))
      return res.status(400).json({ message: "Invalid website ID." });

    const { draftState } = req.body;
    if (!draftState) return res.status(400).json({ message: "Draft state is required." });

    const website = await Website.findByIdAndUpdate(
      req.params.websiteId,
      { $set: { draftState } },
      { new: true },
    );
    if (!website) return res.status(404).json({ message: "Website not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "website_updated",
      description: `Admin edited website draft for "${website.name}".`,
      resource: { type: "website", id: String(website._id), name: website.name },
    });

    return res.json({
      website: formatWebsite(website.toObject()),
      message: "Draft saved successfully.",
    });
  } catch (error) {
    return next(error);
  }
});

// ── Publish Website (Admin Testing) ───────────────────────────
router.post("/:websiteId/publish", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.websiteId))
      return res.status(400).json({ message: "Invalid website ID." });

    const website = await Website.findById(req.params.websiteId);
    if (!website) return res.status(404).json({ message: "Website not found." });

    website.publishedState = website.draftState;
    website.status = "published";
    website.markModified("draftState");
    website.markModified("publishedState");
    await website.save();

    await logActivity({
      ...buildLogContext(req),
      action: "website_published",
      description: `Admin published website "${website.name}".`,
      resource: { type: "website", id: String(website._id), name: website.name },
    });

    return res.json({
      website: formatWebsite(website.toObject()),
      message: "Website published successfully.",
    });
  } catch (error) {
    return next(error);
  }
});

// ── Update Website Status ─────────────────────────────────────
router.patch("/:websiteId/status", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.websiteId))
      return res.status(400).json({ message: "Invalid website ID." });

    const { status } = req.body ?? {};
    const validStatuses = ["draft", "archived"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}.` });

    const website = await Website.findByIdAndUpdate(
      req.params.websiteId,
      { status },
      { new: true },
    ).populate("owner", "name email");

    if (!website) return res.status(404).json({ message: "Website not found." });

    const actionMap = { archived: "website_archived", draft: "website_suspended" };
    await logActivity({
      ...buildLogContext(req),
      action: actionMap[status] || "website_suspended",
      description: `Website "${website.name}" status changed to ${status}.`,
      resource: { type: "website", id: String(website._id), name: website.name },
    });

    return res.json({ message: "Website status updated.", website: formatWebsite(website.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Delete Website ────────────────────────────────────────────
router.delete("/:websiteId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.websiteId))
      return res.status(400).json({ message: "Invalid website ID." });

    const website = await Website.findByIdAndDelete(req.params.websiteId);
    if (!website) return res.status(404).json({ message: "Website not found." });

    // Cleanup domains pointing to this website
    await Domain.updateMany({ website: website._id }, { $unset: { website: 1 } });

    await logActivity({
      ...buildLogContext(req),
      action: "website_deleted",
      description: `Website "${website.name}" permanently deleted.`,
      resource: { type: "website", id: String(website._id), name: website.name },
    });

    return res.json({ message: "Website deleted." });
  } catch (error) {
    return next(error);
  }
});

// ── Website Stats ─────────────────────────────────────────────
router.get("/stats/overview", async (req, res, next) => {
  try {
    const stats = await Website.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byTemplate = await Website.aggregate([
      { $group: { _id: "$templateName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return res.json({ byStatus: stats, byTemplate });
  } catch (error) {
    return next(error);
  }
});

// ── Helpers ───────────────────────────────────────────────────
function formatWebsite(w) {
  return {
    id: w._id,
    name: w.name,
    templateId: w.templateId,
    templateName: w.templateName,
    status: w.status,
    lastOpenedAt: w.lastOpenedAt,
    owner: w.owner ? {
      id: w.owner._id || w.owner,
      name: w.owner.name,
      email: w.owner.email,
      businessName: w.owner.business?.name,
      tenantStatus: w.owner.tenantStatus,
      plan: w.owner.plan,
    } : { id: w.owner },
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

function groupByType(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.mediaType]) groups[item.mediaType] = { count: 0, bytes: 0 };
    groups[item.mediaType].count++;
    groups[item.mediaType].bytes += item.size;
  }
  return groups;
}

export default router;
