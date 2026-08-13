import mongoose from "mongoose";

export const EMAIL_TEMPLATE_TYPES = [
  "invitation",
  "welcome",
  "password_reset",
  "email_verification",
  "subscription_created",
  "subscription_renewed",
  "subscription_cancelled",
  "payment_success",
  "payment_failed",
  "invoice",
  "announcement",
  "ticket_opened",
  "ticket_reply",
  "ticket_resolved",
  "custom",
  "otp",
  "greeting",
  "offer",
  "generic"
];

export const EMAIL_TEMPLATE_CATEGORIES = [
  "User",
  "Auth",
  "Business",
  "Invitation",
  "Subscription",
  "Invoice",
  "Offer",
  "Global",
  "General"
];

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: EMAIL_TEMPLATE_TYPES, required: true, index: true },
    category: { type: String, enum: EMAIL_TEMPLATE_CATEGORIES, default: "General" },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    htmlBody: { type: String, required: true },
    textBody: { type: String, default: "" },
    variables: [
      {
        key: { type: String, trim: true, maxlength: 80 },
        description: { type: String, trim: true, maxlength: 200 },
        example: { type: String, trim: true, maxlength: 200 },
      },
    ],
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    previewText: { type: String, trim: true, maxlength: 200, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

emailTemplateSchema.index({ type: 1, isDefault: 1 });

export const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);
