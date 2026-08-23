import nodemailer from "nodemailer";
import { Resend } from "resend";
import { EmailTemplate } from "../models/EmailTemplate.js";
import { EmailLog } from "../models/EmailLog.js";

/**
 * Resend client initialization (lazy-loaded if RESEND_API_KEY is provided)
 */
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * SMTP Transport fallback
 */
function getSmtpTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Interpolate template variables: replaces {{key}} with values.
 */
function interpolate(template, variables = {}) {
  const globals = {
    appName: "WebMintra",
    year: new Date().getFullYear().toString(),
    supportEmail: "support@webmintra.in",
    dashboardUrl: process.env.FRONTEND_ORIGIN || "http://localhost:8080",
  };
  const allVars = { ...globals, ...variables };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => allVars[key] ?? `{{${key}}}`);
}

/**
 * Send a raw email with support for Resend API (default if RESEND_API_KEY is present)
 * and automatic fallback to SMTP.
 */
export async function sendRawEmail({ to, subject, text, html, fromAddress, fromName, replyTo }) {
  const senderName = fromName || process.env.SMTP_SENDER_NAME || process.env.RESEND_FROM_NAME || "WebMintra";
  const fromEmail = fromAddress || process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || "onboarding@resend.dev";
  const defaultReplyTo = replyTo || process.env.EMAIL_REPLY_TO || "support@webmintra.in";
  const formattedFrom = `"${senderName}" <${fromEmail}>`;

  const resend = getResendClient();

  // 1. If Resend is configured, use Resend HTTP API (highest reliability & HTML rendering)
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: formattedFrom,
        to: Array.isArray(to) ? to : [to],
        reply_to: defaultReplyTo,
        subject,
        html: html || undefined,
        text: text || undefined,
      });

      if (response.error) {
        console.error("[EmailService:Resend Error]:", response.error);
        throw new Error(response.error.message || "Resend email delivery failed.");
      }

      return { provider: "resend", id: response.data?.id };
    } catch (err) {
      console.warn("[EmailService:Resend Failed, falling back to SMTP]:", err.message);
      // fallback to SMTP if Resend fails
    }
  }

  // 2. SMTP Transport Fallback
  const transport = getSmtpTransport();
  if (transport) {
    const info = await transport.sendMail({
      from: formattedFrom,
      to,
      replyTo: defaultReplyTo,
      subject,
      text,
      html,
    });
    return { provider: "smtp", messageId: info.messageId };
  }

  throw new Error("No active email transport available. Please set RESEND_API_KEY or SMTP credentials.");
}

/**
 * Send email using a stored custom HTML/Text template by type.
 * Supports custom templates designed in the Admin Email Template builder.
 */
export async function sendTemplatedEmail({ type, to, variables = {}, fallback }) {
  let templateUsed = null;
  let subject = fallback?.subject || "No Subject";
  let htmlBody = fallback?.html || "";
  let textBody = fallback?.text || "";

  try {
    const template = await EmailTemplate.findOne({ type, isActive: true }).sort({ isDefault: -1 }).lean();
    if (template) {
      templateUsed = template._id;
      subject = interpolate(template.subject, variables);
      htmlBody = interpolate(template.htmlBody, variables);
      if (template.textBody) textBody = interpolate(template.textBody, variables);
    }
  } catch (err) {
    console.warn("[EmailService] Template lookup failed, using fallback:", err.message);
  }

  try {
    if (htmlBody || textBody) {
      const res = await sendRawEmail({ to, subject, text: textBody, html: htmlBody });
      await EmailLog.create({
        to,
        type,
        templateId: templateUsed,
        subject,
        status: "sent",
        metadata: { provider: res?.provider },
      });
      return res;
    }
  } catch (error) {
    await EmailLog.create({
      to,
      type,
      templateId: templateUsed,
      subject,
      status: "failed",
      error: error.message,
    });
    throw error;
  }
}

/**
 * Send OTP email.
 */
export async function sendOtpEmail({ email, name, code, purpose }) {
  const isReset = purpose === "password reset";
  const action = isReset ? "reset your password" : "verify your email address";

  await sendTemplatedEmail({
    type: "otp",
    to: email,
    variables: { name, code, purpose, action },
    fallback: {
      subject: isReset ? "Your WebMintra password reset code" : "Verify your WebMintra email",
      text: `Hello ${name},\n\nUse this code to ${action}: ${code}\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background-color:#f8fafc;padding:32px;color:#0f172a;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:32px;">
    <h2 style="margin-top:0;color:#0f172a;">WebMintra</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Use the verification code below to ${action}:</p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;text-align:center;margin:24px 0;">
      <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#059669;font-family:monospace;">${code}</span>
    </div>
    <p style="font-size:12px;color:#64748b;">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
  </div>
</body>
</html>`,
    },
  });
}

/**
 * Send invitation email.
 */
export async function sendInvitationEmail({ email, ownerName, businessName, invitationUrl }) {
  await sendTemplatedEmail({
    type: "invitation",
    to: email,
    variables: { ownerName, businessName, invitationUrl },
    fallback: {
      subject: `You're invited to manage ${businessName} on WebMintra`,
      text: `Hello ${ownerName},\n\nYou've been invited to set up ${businessName} on WebMintra.\n\nAccept your invitation: ${invitationUrl}\n\nThis invitation expires in 7 days.`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background-color:#f8fafc;padding:32px;color:#0f172a;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:32px;">
    <h2 style="margin-top:0;color:#0f172a;">WebMintra</h2>
    <p>Hello <strong>${ownerName}</strong>,</p>
    <p>You have been invited to set up and manage <strong>${businessName}</strong> on WebMintra.</p>
    <div style="margin:28px 0;">
      <a href="${invitationUrl}" style="background:#059669;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">Accept Invitation</a>
    </div>
    <p style="font-size:12px;color:#64748b;">This invitation expires in 7 days.</p>
  </div>
</body>
</html>`,
    },
  });
}

/**
 * Send welcome email after onboarding.
 */
export async function sendWelcomeEmail({ email, name }) {
  await sendTemplatedEmail({
    type: "welcome",
    to: email,
    variables: { name },
    fallback: {
      subject: "Welcome to WebMintra!",
      text: `Hello ${name},\n\nWelcome to WebMintra! Your account is ready. You can now log in and start building your website.\n\nBest regards,\nThe WebMintra Team`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background-color:#f8fafc;padding:32px;color:#0f172a;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:32px;">
    <h2 style="margin-top:0;color:#059669;">Welcome to WebMintra!</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your workspace is ready. You can now log in, customize your website pages, connect custom domains, and launch your business online.</p>
    <p style="margin-top:24px;font-size:13px;color:#64748b;">Best regards,<br/>The WebMintra Team</p>
  </div>
</body>
</html>`,
    },
  });
}

/**
 * Send subscription update email.
 */
export async function sendSubscriptionEmail({ type, email, name, planName, amount, currency, nextBillingDate }) {
  await sendTemplatedEmail({
    type,
    to: email,
    variables: { name, planName, amount, currency, nextBillingDate },
    fallback: {
      subject: `Your WebMintra subscription update`,
      text: `Hello ${name},\n\nYour subscription to ${planName} has been updated.\n\nBest regards,\nThe WebMintra Team`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background-color:#f8fafc;padding:32px;color:#0f172a;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:32px;">
    <h2 style="margin-top:0;color:#0f172a;">Subscription Update</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your subscription to <strong>${planName}</strong> has been updated.</p>
    <p style="margin-top:24px;font-size:13px;color:#64748b;">Best regards,<br/>The WebMintra Team</p>
  </div>
</body>
</html>`,
    },
  });
}
