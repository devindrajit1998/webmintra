import mongoose from "mongoose";

export const MEDIA_TYPES = ["image", "video", "document", "audio", "other"];

const storageItemSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    website: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      index: true,
    },
    filename: { type: String, required: true, trim: true, maxlength: 255 },
    originalName: { type: String, trim: true, maxlength: 255, default: "" },
    mimeType: { type: String, trim: true, maxlength: 127, default: "" },
    mediaType: { type: String, enum: MEDIA_TYPES, default: "other", index: true },
    size: { type: Number, required: true, min: 0 }, // bytes
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    path: { type: String, trim: true, maxlength: 500, default: "" },
    bucket: { type: String, trim: true, maxlength: 120, default: "" },
    isUsed: { type: Boolean, default: true, index: true },
    lastUsedAt: { type: Date },
    alt: { type: String, trim: true, maxlength: 300, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

storageItemSchema.index({ tenant: 1, mediaType: 1 });
storageItemSchema.index({ isUsed: 1, updatedAt: -1 });

export const StorageItem = mongoose.model("StorageItem", storageItemSchema);
