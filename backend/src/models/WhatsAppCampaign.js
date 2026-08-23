import mongoose from "mongoose";

export const CAMPAIGN_STATUSES = [
  "draft",
  "queued",
  "sending",
  "paused",
  "completed",
  "cancelled",
  "failed",
];

const whatsAppCampaignSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: "queued",
      index: true,
    },
    totalRecipients: {
      type: Number,
      default: 0,
    },
    queuedCount: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    skippedCount: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

whatsAppCampaignSchema.index({ tenant: 1, createdAt: -1 });

export const WhatsAppCampaign = mongoose.model(
  "WhatsAppCampaign",
  whatsAppCampaignSchema
);
