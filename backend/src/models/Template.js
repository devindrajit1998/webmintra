import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, required: true },       // business category: gym, clinic, etc.
    pageCount: { type: Number, default: 1, min: 1 }, // used to filter by plan's pagesPerWebsite limit
    thumbnailUrl: { type: String },
    htmlContent: { type: String, required: true }, // Main index.html
    pages: [
      {
        name: { type: String, required: true },
        htmlContent: { type: String, required: true }
      }
    ],
    assets: [
      {
        url: { type: String },
        kind: { type: String }, // 'image', 'video', 'style', 'script'
      }
    ],
    stats: { type: Object, default: {} },
    issuesCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

templateSchema.index({ category: 1, pageCount: 1, isActive: 1 });

export const Template = mongoose.model("Template", templateSchema);
