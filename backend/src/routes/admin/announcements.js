/**
 * Announcements Routes
 * /api/admin/announcements
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Announcement, ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_AUDIENCES } from "../../models/Announcement.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, isString, isEnum, stripUndefined } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "publishedAt"]);
    const filter = {};

    if (req.query.status && ANNOUNCEMENT_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.audience && ANNOUNCEMENT_AUDIENCES.includes(req.query.audience)) filter.audience = req.query.audience;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: "i" };

    const [announcements, total] = await Promise.all([
      Announcement.find(filter).sort(sort).skip(skip).limit(limit)
        .populate("createdBy", "name email")
        .lean(),
      Announcement.countDocuments(filter),
    ]);

    return res.json({ announcements, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:announcementId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.announcementId)) return res.status(400).json({ message: "Invalid ID." });
    const announcement = await Announcement.findById(req.params.announcementId)
      .populate("createdBy", "name email").lean();
    if (!announcement) return res.status(404).json({ message: "Announcement not found." });
    return res.json({ announcement });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (!isString(b.title, { max: 200 })) return res.status(400).json({ message: "title is required." });
    if (!isString(b.content, { min: 1, max: 10000 })) return res.status(400).json({ message: "content is required." });

    const status = ANNOUNCEMENT_STATUSES.includes(b.status) ? b.status : "draft";
    const announcement = await Announcement.create({
      title: b.title.trim(),
      content: b.content,
      excerpt: b.excerpt?.trim() || "",
      type: ["info", "warning", "success", "maintenance", "feature"].includes(b.type) ? b.type : "info",
      status,
      audience: ANNOUNCEMENT_AUDIENCES.includes(b.audience) ? b.audience : "all",
      targetPlans: Array.isArray(b.targetPlans) ? b.targetPlans : [],
      publishedAt: status === "published" ? new Date() : undefined,
      scheduledAt: status === "scheduled" && b.scheduledAt ? new Date(b.scheduledAt) : undefined,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      isPinned: b.isPinned ?? false,
      isEmailNotification: b.isEmailNotification ?? false,
      createdBy: req.user._id,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "announcement_published",
      description: `Announcement "${announcement.title}" created (${status}).`,
      resource: { type: "announcement", id: String(announcement._id), name: announcement.title },
    });

    return res.status(201).json({ announcement });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:announcementId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.announcementId)) return res.status(400).json({ message: "Invalid ID." });
    const b = req.body ?? {};
    const status = ANNOUNCEMENT_STATUSES.includes(b.status) ? b.status : undefined;
    const update = stripUndefined({
      title: b.title?.trim(), content: b.content, excerpt: b.excerpt?.trim(),
      type: b.type, status, audience: ANNOUNCEMENT_AUDIENCES.includes(b.audience) ? b.audience : undefined,
      targetPlans: b.targetPlans, isPinned: b.isPinned, isEmailNotification: b.isEmailNotification,
      publishedAt: status === "published" ? new Date() : undefined,
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : undefined,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      updatedBy: req.user._id,
    });

    const announcement = await Announcement.findByIdAndUpdate(req.params.announcementId, { $set: update }, { new: true });
    if (!announcement) return res.status(404).json({ message: "Announcement not found." });
    return res.json({ announcement });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:announcementId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.announcementId)) return res.status(400).json({ message: "Invalid ID." });
    const announcement = await Announcement.findByIdAndDelete(req.params.announcementId);
    if (!announcement) return res.status(404).json({ message: "Announcement not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "announcement_deleted",
      description: `Announcement "${announcement.title}" deleted.`,
      resource: { type: "announcement", id: String(announcement._id), name: announcement.title },
    });

    return res.json({ message: "Announcement deleted." });
  } catch (error) {
    return next(error);
  }
});

export default router;
