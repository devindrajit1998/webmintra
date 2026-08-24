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
    if (req.query.search && typeof req.query.search === "string") {
      const { escapeRegex } = await import("../../lib/validate.js");
      filter.title = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
    }

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

    // ── Dispatch notifications to Tenants when published ───────────────────
    if (status === "published") {
      dispatchAnnouncementToTenants(announcement).catch((err) =>
        console.warn("[Announcement Dispatch Error]:", err?.message)
      );
    }

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

    const oldAnnouncement = await Announcement.findById(req.params.announcementId).lean();
    const announcement = await Announcement.findByIdAndUpdate(req.params.announcementId, { $set: update }, { new: true });
    if (!announcement) return res.status(404).json({ message: "Announcement not found." });

    // If transitioned to published, dispatch notifications
    if (status === "published" && oldAnnouncement?.status !== "published") {
      dispatchAnnouncementToTenants(announcement).catch((err) =>
        console.warn("[Announcement Dispatch Error]:", err?.message)
      );
    }

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

/**
 * Dispatches In-App Notification and optional Email to target tenants
 */
async function dispatchAnnouncementToTenants(announcement) {
  try {
    const { User } = await import("../../models/User.js");
    const { Notification } = await import("../../models/Notification.js");

    const filter = { role: "tenant", isEmailVerified: true };

    if (announcement.audience === "trial") {
      filter.tenantStatus = "active";
    } else if (announcement.audience === "active") {
      filter.tenantStatus = "active";
    } else if (announcement.audience === "specific_plans" && announcement.targetPlans?.length) {
      filter.plan = { $in: announcement.targetPlans };
    }

    const tenants = await User.find(filter).select("_id email name plan").lean();
    if (!tenants.length) return;

    // 1. Create In-App Notifications
    const notifications = tenants.map((tenant) => ({
      recipient: tenant._id,
      type: "announcement",
      title: announcement.title,
      message: announcement.excerpt || announcement.content.slice(0, 300),
      link: "/tenant",
      metadata: { announcementId: String(announcement._id), type: announcement.type },
      expiresAt: announcement.expiresAt,
    }));

    await Notification.insertMany(notifications, { ordered: false });

    // 2. Send Email Notification if enabled
    if (announcement.isEmailNotification) {
      const { sendRawEmail } = await import("../../services/mail.js");
      let sentCount = 0;

      for (const tenant of tenants) {
        if (!tenant.email) continue;
        try {
          await sendRawEmail({
            to: tenant.email,
            subject: `[WebMintra Announcement] ${announcement.title}`,
            text: `${announcement.title}\n\n${announcement.content}\n\nView more on your dashboard: https://webmintra.in/tenant`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
                <div style="padding:12px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-bottom:16px;">
                  <span style="font-size:12px;font-weight:bold;color:#c2410c;">📢 Announcement from WebMintra</span>
                </div>
                <h2 style="color:#0f172a;margin-top:0;">${announcement.title}</h2>
                <div style="color:#334155;font-size:14px;line-height:1.6;">
                  ${announcement.content}
                </div>
                <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0 16px 0;"/>
                <a href="https://webmintra.in/tenant" style="display:inline-block;background:#059669;color:#ffffff;font-weight:bold;font-size:13px;padding:10px 18px;border-radius:8px;text-decoration:none;">
                  Open Workspace
                </a>
              </div>
            `,
          });
          sentCount++;
        } catch (mailErr) {
          console.warn(`[Announcement Email Failed for ${tenant.email}]:`, mailErr?.message);
        }
      }

      await Announcement.findByIdAndUpdate(announcement._id, {
        $set: { emailSentAt: new Date(), emailSentCount: sentCount },
      });
    }
  } catch (err) {
    console.error("[Dispatch Announcement Error]:", err);
  }
}

export default router;
