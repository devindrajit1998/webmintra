import nodemailer from "nodemailer";
import { EmailTemplate } from "../models/EmailTemplate.js";
import { EmailLog } from "../models/EmailLog.js";

const requiredConfig = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];

function getTransport() {
  const missing = requiredConfig.filter((key) => !process.env[key]);
  if (missing.length)
    throw new Error(`Email delivery is not configured: ${missing.join(", ")}`);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
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
    supportEmail: "support@webmintra.com",
    dashboardUrl: process.env.FRONTEND_ORIGIN || "http://localhost:8080",
  };
  const allVars = { ...globals, ...variables };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => allVars[key] ?? `{{${key}}}`);
}

/**
 * Send a raw email (text only).
 */
export async function sendRawEmail({ to, subject, text, html }) {
  const senderName = process.env.SMTP_SENDER_NAME || "WebMintra";
  await getTransport().sendMail({
    from: `"${senderName}" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    text,
    html,
  });
}

/**
 * Send email using a stored template by type.
 * Falls back to plain text if no matching template is found.
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
    console.warn("[EmailService] Template lookup failed, falling back:", err.message);
  }

  try {
    if (htmlBody) {
      await sendRawEmail({ to, subject, text: textBody, html: htmlBody });
      await EmailLog.create({ to, type, templateId: templateUsed, subject, status: "sent" });
    }
  } catch (error) {
    await EmailLog.create({ to, type, templateId: templateUsed, subject, status: "failed", error: error.message });
    throw error;
  }
}

/**
 * Send OTP email (re-exported for backward compat).
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
      html: `<p>Hello <strong>${name}</strong>,</p><p>Use this code to ${action}:</p><h2 style="letter-spacing:8px;font-family:monospace;">${code}</h2><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
    }
  });
}

/**
 * Send invitation email (re-exported for backward compat).
 */
export async function sendInvitationEmail({ email, ownerName, businessName, invitationUrl }) {
  await sendTemplatedEmail({
    type: "invitation",
    to: email,
    variables: { ownerName, businessName, invitationUrl },
    fallback: {
      subject: `You're invited to manage ${businessName} on WebMintra`,
      text: `Hello ${ownerName},\n\nYou've been invited to set up ${businessName} on WebMintra.\n\nAccept your invitation: ${invitationUrl}\n\nThis invitation expires in 7 days.`,
      html: `<p>Hello <strong>${ownerName}</strong>,</p><p>You've been invited to set up <strong>${businessName}</strong> on WebMintra.</p><p><a href="${invitationUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invitation</a></p><p>This invitation expires in 7 days.</p>`,
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
      html: `<p>Hello <strong>${name}</strong>,</p><p>Welcome to WebMintra! Your account is ready. You can now log in and start building your website.</p><p>Best regards,<br/>The WebMintra Team</p>`,
    },
  });
}

/**
 * Send subscription-related email.
 */
export async function sendSubscriptionEmail({ type, email, name, planName, amount, currency, nextBillingDate }) {
  await sendTemplatedEmail({
    type,
    to: email,
    variables: { name, planName, amount, currency, nextBillingDate },
    fallback: {
      subject: `Your WebMintra subscription update`,
      text: `Hello ${name},\n\nYour subscription to ${planName} has been updated.\n\nBest regards,\nThe WebMintra Team`,
      html: `<p>Hello <strong>${name}</strong>,</p><p>Your subscription to <strong>${planName}</strong> has been updated.</p><p>Best regards,<br/>The WebMintra Team</p>`,
    },
  });
}
