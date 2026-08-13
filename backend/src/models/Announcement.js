import mongoose from "mongoose";

export const ANNOUNCEMENT_STATUSES = ["draft", "published", "scheduled", "archived"];
export const ANNOUNCEMENT_AUDIENCES = ["all", "tenants", "trial", "active", "specific_plans"];

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 10000 },
    excerpt: { type: String, trim: true, maxlength: 500, default: "" },
    type: {
      type: String,
      enum: ["info", "warning", "success", "maintenance", "feature"],
      default: "info",
    },
    status: { type: String, enum: ANNOUNCEMENT_STATUSES, default: "draft", index: true },
    audience: { type: String, enum: ANNOUNCEMENT_AUDIENCES, default: "all" },
    targetPlans: [{ type: String }],
    publishedAt: { type: Date },
    scheduledAt: { type: Date },
    expiresAt: { type: Date },
    isPinned: { type: Boolean, default: false },
    isEmailNotification: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    emailSentCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

announcementSchema.index({ status: 1, publishedAt: -1 });
announcementSchema.index({ audience: 1, status: 1 });

export const Announcement = mongoose.model("Announcement", announcementSchema);
