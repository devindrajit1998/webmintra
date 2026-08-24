/**
 * Inbound Email Webhook & Ingestion Route
 * /api/webhooks/inbound-email
 */

import { Router } from "express";
import { InboxMessage } from "../../models/InboxMessage.js";
import { User } from "../../models/User.js";
import { Lead } from "../../models/Lead.js";
import { Notification } from "../../models/Notification.js";

const router = Router();

/**
 * Universal Inbound Email Webhook
 * Handles webhooks from Resend, Postmark, SendGrid, Brevo, Mailgun, or Cloudflare Email Routing
 */
router.post("/", async (req, res) => {
  try {
    const raw = req.body || {};
    // Resend wraps the payload in req.body.data for email.received events
    const payload = raw.data || raw;

    let fromEmail = "";
    let fromName = "";
    let toEmail = "support@webmintra.in";
    let subject = "No Subject";
    let htmlBody = "";
    let textBody = "";
    let messageId = "";
    let attachments = [];

    // 1. Resend / Cloudflare / Postmark / SendGrid Payload Format
    if (payload.from) {
      if (typeof payload.from === "string") {
        const match = payload.from.match(/(.*)<(.+)>/);
        if (match) {
          fromName = match[1].trim().replace(/^["']|["']$/g, "");
          fromEmail = match[2].trim().toLowerCase();
        } else {
          fromEmail = payload.from.trim().toLowerCase();
        }
      } else if (Array.isArray(payload.from) && payload.from.length > 0) {
        const firstFrom = payload.from[0];
        if (typeof firstFrom === "string") {
          fromEmail = firstFrom.toLowerCase();
        } else if (firstFrom?.email) {
          fromEmail = firstFrom.email.toLowerCase();
          fromName = firstFrom.name || "";
        }
      } else if (payload.from.email) {
        fromEmail = payload.from.email.toLowerCase();
        fromName = payload.from.name || "";
      }
    }

    if (payload.to) {
      if (Array.isArray(payload.to)) {
        const firstTo = payload.to[0];
        toEmail = typeof firstTo === "string" ? firstTo : firstTo?.email || "support@webmintra.in";
      } else if (typeof payload.to === "string") {
        toEmail = payload.to;
      }
    }

    subject = payload.subject || payload.Subject || raw.subject || "No Subject";
    let rawHtml = payload.html || payload.HtmlBody || payload["body-html"] || payload.htmlBody || "";
    let rawText = payload.text || payload.TextBody || payload["body-plain"] || payload.textBody || "";
    messageId = payload.email_id || payload.messageId || payload.MessageID || payload.id || raw.id || `inb_${Date.now()}`;

    // Clean and unwrap raw MIME RFC 822 stream if passed from Cloudflare Worker
    const parsedMime = parseMimeContent(rawText || rawHtml);
    textBody = parsedMime.text || rawText || "";
    htmlBody = parsedMime.html || rawHtml || (textBody ? `<p>${textBody.replace(/\n/g, "<br/>")}</p>` : "");

    // Handle Attachments
    if (Array.isArray(payload.attachments)) {
      attachments = payload.attachments.map((att) => ({
        filename: att.filename || att.Name || "attachment",
        contentType: att.contentType || att.ContentType || "application/octet-stream",
        size: att.size || att.ContentLength || 0,
        url: att.url || att.Content || "",
      }));
    }

    if (!fromEmail) {
      console.warn("[Inbound Webhook Warning] Received payload without identifiable fromEmail:", JSON.stringify(raw));
      return res.status(400).json({ message: "Sender email is missing from payload." });
    }

    // ── LOOP BREAK GUARD ──────────────────────────────────────────────────────
    // Prevent infinite email loops: skip if this is a notification we already sent
    const LOOP_MARKERS = ["[webmintra inbox]", "x-webmintra-internal"];
    const isLoopback =
      LOOP_MARKERS.some((m) => subject.toLowerCase().includes(m)) ||
      (raw.headers && raw.headers["x-webmintra-internal"] === "true") ||
      toEmail.toLowerCase().includes("webmintraofficial") ||
      fromEmail.toLowerCase().includes("webmintraofficial") ||
      fromEmail.toLowerCase().includes("noreply@webmintra") ||
      fromEmail.toLowerCase().includes("no-reply@webmintra");

    if (isLoopback) {
      console.log(`[Inbound Webhook] Loop detected — skipping: FROM=${fromEmail} SUBJECT="${subject}"`);
      return res.status(200).json({ success: true, message: "Loop email detected and skipped." });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Auto-detect Tenant / User match
    const existingUser = await User.findOne({ email: fromEmail }).select("_id role business").lean();
    
    // Auto-detect Lead match
    const existingLead = await Lead.findOne({ email: fromEmail }).select("_id name businessName").lean();

    // Auto-categorize based on destination alias (sales@, billing@, support@) and content
    let category = "support";
    const lowerTo = toEmail.toLowerCase();
    const lowerSub = subject.toLowerCase();
    const lowerBody = (textBody || htmlBody).toLowerCase();

    if (lowerTo.includes("sale") || lowerTo.includes("hello") || lowerSub.includes("sale") || lowerSub.includes("price") || lowerSub.includes("quote") || lowerSub.includes("demo") || lowerSub.includes("plan")) {
      category = "sales_inquiry";
    } else if (lowerTo.includes("bill") || lowerTo.includes("account") || lowerSub.includes("bill") || lowerSub.includes("invoice") || lowerSub.includes("refund") || lowerSub.includes("payment") || lowerSub.includes("gst")) {
      category = "billing";
    } else if (lowerSub.includes("feedback") || lowerSub.includes("review") || lowerSub.includes("feature")) {
      category = "feedback";
    }

    const message = await InboxMessage.create({
      messageId,
      fromEmail,
      fromName: fromName || existingUser?.business?.name || existingLead?.name || "",
      toEmail,
      subject,
      htmlBody: htmlBody || `<p>${textBody.replace(/\n/g, "<br/>")}</p>`,
      textBody,
      category,
      status: "unread",
      tenantId: existingUser?._id,
      leadId: existingLead?._id,
      attachments,
      receivedAt: new Date(),
    });

    // ── In-App Notification: Notify all active admins ──────────────────────────
    try {
      const admins = await User.find({ role: "admin", isEmailVerified: true }).select("_id").lean();
      if (admins.length) {
        await Notification.insertMany(
          admins.map((admin) => ({
            recipient: admin._id,
            type: "system",
            title: `New Email from ${fromName || fromEmail}`,
            message: subject ? String(subject).slice(0, 300) : "No subject",
            link: "/admin/mailbox",
            metadata: {
              inboxMessageId: String(message._id),
              fromEmail,
              category,
            },
          })),
          { ordered: false }
        );
      }
    } catch (notifErr) {
      console.warn("[Inbound Email Notification Error]:", notifErr?.message);
    }

    // Note: Cloudflare Email Routing already forwards a pristine copy to your Gmail inbox.
    // In-app notifications in Admin Mailbox are recorded above.

    return res.status(201).json({
      success: true,
      message: "Email logged successfully in Admin Mailbox and forwarded to Admin.",
      id: message._id,
    });
  } catch (error) {
    console.error("[Inbound Email Webhook Error]:", error);
    return res.status(500).json({ message: "Failed to process inbound email: " + error.message });
  }
});

function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseMimeContent(content) {
  if (!content || typeof content !== "string") return { text: "", html: "" };
  if (!content.startsWith("Received:") && !content.includes("ARC-Seal:") && !content.includes("MIME-Version:")) {
    return { text: content, html: "" };
  }

  const parts = content.split(/\r?\n\r?\n/);
  const headers = parts[0] || "";
  const body = parts.slice(1).join("\n\n");

  const boundaryMatch = headers.match(/boundary=["']?([^"';\r\n]+)["']?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1].trim();
    const sections = body.split(new RegExp(`--${boundary.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`));
    let plainText = "";
    let htmlText = "";

    for (const sec of sections) {
      if (sec.trim().endsWith("--")) continue;
      const subParts = sec.split(/\r?\n\r?\n/);
      if (subParts.length < 2) continue;
      const subHeaders = subParts[0];
      let subContent = subParts.slice(1).join("\n\n").trim();

      if (/Content-Transfer-Encoding:\s*base64/i.test(subHeaders)) {
        try {
          subContent = Buffer.from(subContent.replace(/\s+/g, ""), "base64").toString("utf-8");
        } catch {}
      } else if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(subHeaders)) {
        subContent = decodeQuotedPrintable(subContent);
      }

      if (/Content-Type:\s*text\/html/i.test(subHeaders)) {
        htmlText = subContent;
      } else if (/Content-Type:\s*text\/plain/i.test(subHeaders)) {
        plainText = subContent;
      }
    }

    if (plainText || htmlText) {
      return { text: plainText || htmlText.replace(/<[^>]*>?/gm, "").trim(), html: htmlText };
    }
  }

  return { text: body.trim(), html: `<p>${body.trim().replace(/\n/g, "<br/>")}</p>` };
}

export default router;
