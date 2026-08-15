import mongoose from "mongoose";

const templateCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const TemplateCategory =
  mongoose.models.TemplateCategory || mongoose.model("TemplateCategory", templateCategorySchema);
