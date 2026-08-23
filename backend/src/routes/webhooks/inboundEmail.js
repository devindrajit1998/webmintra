/**
 * Inbound Email Webhook & Ingestion Route
 * /api/webhooks/inbound-email
 */

import { Router } from "express";
import { InboxMessage } from "../../models/InboxMessage.js";
import { User } from "../../models/User.js";
import { Lead } from "../../models/Lead.js";

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

    // ── Dual Delivery: Automatically send a copy to Admin Gmail (Non-blocking) ──
    const adminNotificationEmail = process.env.ADMIN_INBOX_FORWARD_EMAIL || "indrajitghosh449@gmail.com";
    if (adminNotificationEmail && fromEmail !== adminNotificationEmail) {
      import("../../services/mail.js")
        .then(({ sendRawEmail }) => {
          const forwardHtml = `
            <div style="font-family:sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
              <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:24px;">
                <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
                  <span style="font-size:12px;font-weight:bold;color:#059669;">📬 New Inbound Message on WebMintra Admin Mailbox</span>
                </div>
                <h3 style="margin:0 0 8px 0;color:#0f172a;">${subject}</h3>
                <p style="font-size:13px;color:#64748b;margin:0 0 16px 0;">
                  From: <strong>${fromName || fromEmail}</strong> &lt;${fromEmail}&gt; &bull; Sent to: <strong>${toEmail}</strong>
                </p>
                <hr style="border:none;border-top:1px solid #f1f5f9;margin:16px 0;"/>
                <div style="font-size:14px;line-height:1.6;color:#334155;">
                  ${htmlBody || `<p>${textBody.replace(/\n/g, "<br/>")}</p>`}
                </div>
                <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0 16px 0;"/>
                <div style="font-size:12px;color:#64748b;">
                  You can reply directly in your <a href="https://webmintra.in/admin/mailbox" style="color:#059669;font-weight:bold;text-decoration:none;">Admin Mailbox Dashboard</a>.
                </div>
              </div>
            </div>
          `;

          return sendRawEmail({
            to: adminNotificationEmail,
            subject: `[WebMintra Inbox] ${subject} (from ${fromName || fromEmail})`,
            html: forwardHtml,
            text: textBody,
            replyTo: fromEmail,
          });
        })
        .catch((err) => console.warn("[Inbound Email Forward Error]:", err.message));
    }

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
