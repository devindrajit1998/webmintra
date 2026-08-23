/**
 * Admin Mailbox & Inbound Email Management Routes
 * /api/admin/mailbox
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { InboxMessage, INBOX_STATUSES, INBOX_CATEGORIES } from "../../models/InboxMessage.js";
import { sendRawEmail } from "../../services/mail.js";
import { Lead } from "../../models/Lead.js";
import { isMongoId, escapeRegex } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── GET /api/admin/mailbox (List emails with search & filter) ──
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status && INBOX_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    } else if (req.query.folder === "starred") {
      filter.isStarred = true;
    } else if (req.query.folder === "archived") {
      filter.status = "archived";
    } else if (req.query.folder === "spam") {
      filter.status = "spam";
    } else if (!req.query.status) {
      // Default view: exclude archived & spam unless requested
      filter.status = { $nin: ["archived", "spam"] };
    }

    if (req.query.category && INBOX_CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    if (req.query.search && typeof req.query.search === "string") {
      const q = escapeRegex(req.query.search.trim());
      filter.$or = [
        { fromEmail: { $regex: q, $options: "i" } },
        { fromName: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { textBody: { $regex: q, $options: "i" } },
      ];
    }

    const [messages, total, unreadCount, starredCount] = await Promise.all([
      InboxMessage.find(filter)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("tenantId", "name email business")
        .populate("leadId", "name businessName status")
        .lean(),
      InboxMessage.countDocuments(filter),
      InboxMessage.countDocuments({ status: "unread" }),
      InboxMessage.countDocuments({ isStarred: true }),
    ]);

    return res.json({
      messages,
      unreadCount,
      starredCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── GET /api/admin/mailbox/:id (Single thread details) ────────
router.get("/:id", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.id)) return res.status(400).json({ message: "Invalid ID." });

    const message = await InboxMessage.findById(req.params.id)
      .populate("tenantId", "name email business plan")
      .populate("leadId", "name businessName phone status")
      .lean();

    if (!message) return res.status(404).json({ message: "Email not found." });

    // Mark as read if previously unread
    if (message.status === "unread") {
      await InboxMessage.findByIdAndUpdate(req.params.id, { status: "read" });
      message.status = "read";
    }

    return res.json({ message });
  } catch (error) {
    return next(error);
  }
});

// ── POST /api/admin/mailbox/:id/reply (Send reply from Admin) ─
router.post("/:id/reply", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.id)) return res.status(400).json({ message: "Invalid ID." });

    const message = await InboxMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Email not found." });

    const { htmlBody, textBody } = req.body || {};
    if (!htmlBody && !textBody) {
      return res.status(400).json({ message: "Reply content cannot be empty." });
    }

    const replySubject = message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`;
    const authorName = req.user?.name || "WebMintra Support";
    const authorEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || "support@webmintra.in";

    // Format rich HTML with email thread context
    const fullHtml = `
      <div style="font-family:sans-serif;font-size:14px;color:#0f172a;line-height:1.6;">
        ${htmlBody || `<p>${textBody.replace(/\n/g, "<br/>")}</p>`}
        <br/><br/>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
        <div style="font-size:12px;color:#64748b;">
          <strong>On ${new Date(message.receivedAt).toLocaleString()}, &lt;${message.fromEmail}&gt; wrote:</strong>
          <blockquote style="margin:8px 0 0 12px;padding-left:12px;border-left:2px solid #cbd5e1;color:#475569;">
            ${message.htmlBody || message.textBody}
          </blockquote>
        </div>
      </div>
    `;

    // Dispatch email via Resend (or SMTP fallback)
    const sendResult = await sendRawEmail({
      to: message.fromEmail,
      subject: replySubject,
      html: fullHtml,
      text: textBody || htmlBody,
    });

    // Record reply in thread
    message.replies.push({
      authorId: req.user?._id,
      authorName,
      authorEmail,
      to: message.fromEmail,
      subject: replySubject,
      htmlBody: fullHtml,
      textBody,
      sentAt: new Date(),
      providerMessageId: sendResult?.id || sendResult?.messageId,
    });

    message.status = "replied";
    await message.save();

    return res.json({
      success: true,
      message: `Reply sent successfully to ${message.fromEmail}`,
      reply: message.replies[message.replies.length - 1],
    });
  } catch (error) {
    return next(error);
  }
});

// ── PATCH /api/admin/mailbox/:id/status ────────────────────────
router.patch("/:id/status", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.id)) return res.status(400).json({ message: "Invalid ID." });
    const { status, isStarred, category } = req.body || {};

    const updates = {};
    if (status && INBOX_STATUSES.includes(status)) updates.status = status;
    if (typeof isStarred === "boolean") updates.isStarred = isStarred;
    if (category && INBOX_CATEGORIES.includes(category)) updates.category = category;

    const message = await InboxMessage.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!message) return res.status(404).json({ message: "Email not found." });

    return res.json({ message });
  } catch (error) {
    return next(error);
  }
});

// ── POST /api/admin/mailbox/:id/convert-lead ──────────────────
router.post("/:id/convert-lead", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.id)) return res.status(400).json({ message: "Invalid ID." });

    const message = await InboxMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Email not found." });

    // Check if lead already exists
    let lead = await Lead.findOne({ email: message.fromEmail });
    if (!lead) {
      lead = await Lead.create({
        name: message.fromName || message.fromEmail.split("@")[0],
        email: message.fromEmail,
        businessName: message.fromName || "",
        source: "cold_outreach",
        status: "new",
        priority: "high",
        notes: [
          {
            note: `[Created from Mailbox Inbound]: Subject: "${message.subject}"`,
            authorName: req.user?.name || "Admin",
            createdAt: new Date(),
          },
        ],
        createdBy: req.user?._id,
      });
    }

    message.leadId = lead._id;
    await message.save();

    return res.json({
      success: true,
      message: `Email converted to CRM Lead for "${lead.name}".`,
      lead,
    });
  } catch (error) {
    return next(error);
  }
});

// ── DELETE /api/admin/mailbox/:id ─────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.id)) return res.status(400).json({ message: "Invalid ID." });
    await InboxMessage.findByIdAndDelete(req.params.id);
    return res.json({ message: "Email deleted successfully." });
  } catch (error) {
    return next(error);
  }
});

export default router;
