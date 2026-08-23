import mongoose from "mongoose";

export const MESSAGE_TYPES = [
  "auto_reply",
  "lead_alert",
  "manual_followup",
  "campaign",
  "test",
];

export const MESSAGE_JOB_STATUSES = [
  "queued",
  "processing",
  "sent",
  "failed",
  "cancelled",
  "skipped",
];

const whatsAppMessageJobSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormSubmission",
      index: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WhatsAppCampaign",
      index: true,
    },
    // Unique deduplication key to prevent duplicate automatic responses
    dedupKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 4000,
    },
    messageType: {
      type: String,
      enum: MESSAGE_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: MESSAGE_JOB_STATUSES,
      default: "queued",
      index: true,
    },
    error: {
      type: String,
      default: "",
    },
    providerMessageId: {
      type: String,
      default: "",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index for queue worker picking tasks
whatsAppMessageJobSchema.index({ status: 1, scheduledAt: 1, tenant: 1 });

export const WhatsAppMessageJob = mongoose.model(
  "WhatsAppMessageJob",
  whatsAppMessageJobSchema
);
