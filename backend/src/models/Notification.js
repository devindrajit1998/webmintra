import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "system",
  "announcement",
  "billing",
  "subscription",
  "ticket",
  "tenant",
  "security",
  "maintenance",
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    link: { type: String, trim: true, maxlength: 500, default: "" },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    icon: { type: String, trim: true, maxlength: 50, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
