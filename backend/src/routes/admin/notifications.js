/**
 * Notification Management Routes
 * /api/admin/notifications
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Notification, NOTIFICATION_TYPES } from "../../models/Notification.js";
import { User } from "../../models/User.js";
import { parsePagination, parseSort, isMongoId } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── Admin's own notifications ─────────────────────────────────
router.get("/mine", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { recipient: req.user._id };
    if (req.query.unread === "true") filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return res.json({ notifications, unreadCount, pagination: { total, page, limit } });
  } catch (error) {
    return next(error);
  }
});

// ── Mark as read ──────────────────────────────────────────────
router.patch("/mine/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return res.json({ message: "All notifications marked as read." });
  } catch (error) {
    return next(error);
  }
});

router.patch("/mine/:notifId/read", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.notifId)) return res.status(400).json({ message: "Invalid ID." });
    await Notification.findOneAndUpdate(
      { _id: req.params.notifId, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
    );
    return res.json({ message: "Notification marked as read." });
  } catch (error) {
    return next(error);
  }
});

// ── Broadcast notification to tenants ────────────────────────
router.post("/broadcast", async (req, res, next) => {
  try {
    const { title, message, type, link, audience } = req.body ?? {};

    if (!title || !message) return res.status(400).json({ message: "title and message are required." });

    const validType = NOTIFICATION_TYPES.includes(type) ? type : "announcement";

    let recipientQuery = { role: "tenant" };
    if (audience === "active") recipientQuery.tenantStatus = "active";
    else if (audience === "suspended") recipientQuery.tenantStatus = "suspended";

    const recipients = await User.find(recipientQuery).select("_id").lean();

    const notifications = recipients.map((r) => ({
      recipient: r._id,
      type: validType,
      title: String(title).slice(0, 200),
      message: String(message).slice(0, 1000),
      link: link?.slice(0, 500) || "",
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications, { ordered: false });
    }

    return res.json({ message: `Notification broadcast to ${notifications.length} tenants.`, count: notifications.length });
  } catch (error) {
    return next(error);
  }
});

// ── All notifications (admin view of tenant notifications) ────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.type && NOTIFICATION_TYPES.includes(req.query.type)) filter.type = req.query.type;
    if (req.query.recipient && isMongoId(req.query.recipient)) filter.recipient = req.query.recipient;
    if (req.query.isRead === "true") filter.isRead = true;
    if (req.query.isRead === "false") filter.isRead = false;

    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate("recipient", "name email")
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return res.json({ notifications, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

export default router;
