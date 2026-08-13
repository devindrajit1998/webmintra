import mongoose from "mongoose";
import "dotenv/config";
import { EmailTemplate } from "../models/EmailTemplate.js";

const BRAND_COLOR = "#0ea5e9";
const DARK_BG = "#0b1826";
const LIGHT_BG = "#f4f4f5";
const CARD_BG = "#ffffff";
const TEXT_DARK = "#111827";
const TEXT_LIGHT = "#4b5563";
const MUTED = "#94a3b8";

const layout = (bodyContent) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${LIGHT_BG}; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: ${CARD_BG}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <div style="background-color: ${DARK_BG}; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">{{appName}}</h1>
    </div>
    <div style="padding: 40px;">
      ${bodyContent}
    </div>
    <div style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: ${MUTED}; font-size: 13px; margin: 0;">&copy; {{year}} {{appName}}. All rights reserved.</p>
      <p style="color: ${MUTED}; font-size: 13px; margin: 8px 0 0 0;">Need help? Contact <a href="mailto:{{supportEmail}}" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: 500;">{{supportEmail}}</a></p>
    </div>
  </div>
</div>`;

const button = (url, text) => `
<div style="text-align: center; margin: 32px 0;">
  <a href="${url}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);">${text}</a>
</div>`;

const seedTemplates = [
  {
    name: "Default Welcome Email",
    type: "welcome",
    category: "User",
    subject: "Welcome to {{appName}}, {{name}}!",
    previewText: "We're absolutely thrilled to have you.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">Welcome aboard, {{name}}! 🎉</h2>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">Your account has been successfully created. We are thrilled to have you join our community!</p>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">You can now log in to your dashboard to start building incredible websites and managing your business with ease.</p>
      ${button("{{dashboardUrl}}", "Go to your Dashboard")}
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">If you have any questions along the way, our support team is always just a click away.</p>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px; margin-bottom: 0;">Best regards,<br><strong style="color: ${TEXT_DARK};">The {{appName}} Team</strong></p>
    `),
    textBody: "Welcome to {{appName}}, {{name}}!\n\nYour account is ready. Go to {{dashboardUrl}} to start.",
    variables: []
  },
  {
    name: "Default OTP Authentication",
    type: "otp",
    category: "Auth",
    subject: "{{appName}} - {{action}}",
    previewText: "Your secure verification code.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">Hello {{name}},</h2>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">You recently requested to <strong>{{action}}</strong>. Please use the secure verification code below to proceed.</p>
      
      <div style="margin: 36px 0; padding: 28px; background-color: #f8fafc; border-radius: 12px; text-align: center; border: 2px dashed #cbd5e1;">
        <div style="font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: ${BRAND_COLOR}; text-indent: 12px;">{{code}}</div>
      </div>
      
      <p style="color: ${TEXT_LIGHT}; font-size: 15px; line-height: 24px; margin-bottom: 0;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
    `),
    textBody: "Hello {{name}},\n\nUse this code to {{action}}: {{code}}\n\nIt expires in 10 minutes.\n\n{{appName}} Support",
    variables: []
  },
  {
    name: "Default Password Reset",
    type: "password_reset",
    category: "Auth",
    subject: "Reset your {{appName}} Password",
    previewText: "Instructions to reset your password.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">Hello {{name}},</h2>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">We received a request to reset the password for your {{appName}} account. Click the button below to choose a new password.</p>
      ${button("{{resetUrl}}", "Reset Password")}
      <p style="color: ${TEXT_LIGHT}; font-size: 15px; line-height: 24px; margin-bottom: 0;">This link will expire in 1 hour. If you didn't make this request, you can safely ignore this email.</p>
    `),
    textBody: "Hello {{name}},\n\nClick here to reset your password: {{resetUrl}}\n\nIf you didn't request this, ignore this email.",
    variables: []
  },
  {
    name: "Default Team Invitation",
    type: "invitation",
    category: "Invitation",
    subject: "You're invited to join {{businessName}} on {{appName}}",
    previewText: "Accept your invitation to collaborate.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">Hello {{ownerName}},</h2>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">You have been invited to collaborate and manage <strong>{{businessName}}</strong> on {{appName}}.</p>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">Join the team to start managing the website, viewing analytics, and more.</p>
      ${button("{{invitationUrl}}", "Accept Invitation")}
      <p style="color: ${TEXT_LIGHT}; font-size: 15px; line-height: 24px; margin-bottom: 0;">This invitation link will expire in 7 days.</p>
    `),
    textBody: "Hello {{ownerName}},\n\nYou're invited to manage {{businessName}}.\n\nAccept here: {{invitationUrl}}",
    variables: []
  },
  {
    name: "Default Subscription Created",
    type: "subscription_created",
    category: "Subscription",
    subject: "Thank you for subscribing to {{appName}}!",
    previewText: "Your subscription details inside.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">Hi {{name}},</h2>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">Thank you for upgrading! Your subscription to the <strong>{{planName}}</strong> plan has been successfully activated.</p>
      <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; color: ${TEXT_LIGHT}; font-size: 15px;"><strong>Plan:</strong> {{planName}}</p>
        <p style="margin: 0 0 8px 0; color: ${TEXT_LIGHT}; font-size: 15px;"><strong>Amount:</strong> {{currency}} {{amount}}</p>
        <p style="margin: 0; color: ${TEXT_LIGHT}; font-size: 15px;"><strong>Next Billing Date:</strong> {{nextBillingDate}}</p>
      </div>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">You now have access to all the premium features included in your plan.</p>
      ${button("{{dashboardUrl}}", "Explore Premium Features")}
    `),
    textBody: "Hi {{name}},\n\nYour subscription to {{planName}} is active.\nAmount: {{currency}} {{amount}}\nNext Billing: {{nextBillingDate}}",
    variables: []
  },
  {
    name: "Default Payment Success",
    type: "payment_success",
    category: "Invoice",
    subject: "Payment Receipt from {{appName}}",
    previewText: "Your payment was successful.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">Payment Successful</h2>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">Hi {{name}}, we have successfully processed your recent payment.</p>
      <div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; color: #166534; font-size: 15px;"><strong>Amount Paid:</strong> {{currency}} {{amount}}</p>
        <p style="margin: 0 0 8px 0; color: #166534; font-size: 15px;"><strong>Date:</strong> {{paymentDate}}</p>
        <p style="margin: 0; color: #166534; font-size: 15px;"><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
      </div>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">You can view and download your full invoice from the billing section of your dashboard.</p>
      ${button("{{dashboardUrl}}/billing", "View Billing Dashboard")}
    `),
    textBody: "Hi {{name}},\n\nPayment of {{currency}} {{amount}} was successful.\nInvoice: {{invoiceNumber}}\nDate: {{paymentDate}}",
    variables: []
  },
  {
    name: "Default Ticket Opened",
    type: "ticket_opened",
    category: "General",
    subject: "Support Ticket #{{ticketId}} Received",
    previewText: "We have received your support request.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">Hi {{name}},</h2>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">We have received your support request and our team is already on it!</p>
      <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid ${BRAND_COLOR};">
        <p style="margin: 0 0 4px 0; color: ${TEXT_DARK}; font-size: 15px; font-weight: 600;">Ticket: #{{ticketId}}</p>
        <p style="margin: 0; color: ${TEXT_LIGHT}; font-size: 15px;"><strong>Subject:</strong> {{ticketSubject}}</p>
      </div>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">We typically respond within 24 hours. You will receive an email notification as soon as we update your ticket.</p>
      ${button("{{ticketUrl}}", "View Ticket Status")}
    `),
    textBody: "Hi {{name}},\n\nTicket #{{ticketId}} received: {{ticketSubject}}\nWe will respond shortly.",
    variables: []
  },
  {
    name: "Default Ticket Reply",
    type: "ticket_reply",
    category: "General",
    subject: "Update on Ticket #{{ticketId}}",
    previewText: "We've replied to your support ticket.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">Hi {{name}},</h2>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">Our support team has updated your ticket <strong>#{{ticketId}}</strong>.</p>
      <div style="margin: 24px 0; padding: 24px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-style: italic; color: ${TEXT_DARK};">
        "{{replyContent}}"
      </div>
      <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">You can view the full conversation and reply directly from your dashboard.</p>
      ${button("{{ticketUrl}}", "View & Reply")}
    `),
    textBody: "Hi {{name}},\n\nUpdate on ticket #{{ticketId}}:\n\n{{replyContent}}\n\nReply at: {{ticketUrl}}",
    variables: []
  },
  {
    name: "Default Special Offer",
    type: "offer",
    category: "Offer",
    subject: "A special gift just for you, {{name}}! 🎁",
    previewText: "Unlock your exclusive discount inside.",
    isDefault: true,
    htmlBody: layout(`
      <div style="text-align: center;">
        <h2 style="color: ${TEXT_DARK}; font-size: 24px; font-weight: 800; margin-top: 0;">Exclusive Offer</h2>
        <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">Hi {{name}}, as a valued member of our community, we wanted to give you something special.</p>
        
        <div style="margin: 32px 0; padding: 32px 20px; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); border-radius: 12px; color: #ffffff;">
          <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 500; opacity: 0.9;">Use code at checkout to get</p>
          <div style="font-size: 48px; font-weight: 900; margin-bottom: 16px; letter-spacing: -1px;">{{discountText}}</div>
          <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 8px; font-family: monospace; font-size: 24px; font-weight: 700; letter-spacing: 2px;">{{couponCode}}</div>
        </div>
        
        <p style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px;">Don't wait—this special offer expires on <strong>{{expiryDate}}</strong>.</p>
        ${button("{{dashboardUrl}}/subscription", "Redeem Now")}
      </div>
    `),
    textBody: "Hi {{name}},\n\nGet {{discountText}} off with code: {{couponCode}}\n\nRedeem now: {{dashboardUrl}}/subscription\nExpires: {{expiryDate}}",
    variables: []
  },
  {
    name: "Default Announcement",
    type: "announcement",
    category: "Global",
    subject: "{{announcementTitle}}",
    previewText: "Exciting updates from the team.",
    isDefault: true,
    htmlBody: layout(`
      <h2 style="color: ${TEXT_DARK}; font-size: 22px; font-weight: 700; margin-top: 0;">{{announcementTitle}}</h2>
      <div style="color: ${TEXT_LIGHT}; font-size: 16px; line-height: 26px; margin: 24px 0;">
        {{announcementHtml}}
      </div>
      ${button("{{actionUrl}}", "{{actionText}}")}
      <p style="color: ${TEXT_LIGHT}; font-size: 15px; line-height: 24px; margin-bottom: 0;">Thank you for being a part of our journey!<br><strong style="color: ${TEXT_DARK};">The {{appName}} Team</strong></p>
    `),
    textBody: "{{announcementTitle}}\n\n{{announcementText}}\n\n{{actionText}}: {{actionUrl}}",
    variables: []
  }
];

async function seed() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    let inserted = 0;
    let updated = 0;

    for (const t of seedTemplates) {
      const existing = await EmailTemplate.findOne({ type: t.type, isDefault: true });
      if (existing) {
        await EmailTemplate.findByIdAndUpdate(existing._id, {
          $set: {
            name: t.name,
            subject: t.subject,
            previewText: t.previewText,
            htmlBody: t.htmlBody,
            textBody: t.textBody,
            category: t.category,
          }
        });
        console.log(`Updated: ${t.name}`);
        updated++;
      } else {
        await EmailTemplate.create(t);
        console.log(`Inserted: ${t.name}`);
        inserted++;
      }
    }
    
    console.log(`Seeding complete. Inserted ${inserted}, Updated ${updated} templates.`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
