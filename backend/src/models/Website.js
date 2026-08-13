import mongoose from "mongoose";

export const WEBSITE_STATUSES = ["draft", "published", "archived"];

const websiteSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    templateName: { type: String, trim: true, maxlength: 160, default: "" },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template" },
    draftState: { type: mongoose.Schema.Types.Mixed, default: {} },
    publishedState: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: WEBSITE_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    lastOpenedAt: { type: Date },
  },
  { timestamps: true },
);

websiteSchema.index({ owner: 1, updatedAt: -1 });

export const Website = mongoose.model("Website", websiteSchema);
