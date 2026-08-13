import mongoose from "mongoose";

export const ARTICLE_STATUSES = ["draft", "published", "archived"];

const kbCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80, unique: true },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    icon: { type: String, trim: true, maxlength: 50, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const KBCategory = mongoose.model("KBCategory", kbCategorySchema);

const kbArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 200, unique: true, index: true },
    content: { type: String, required: true },
    excerpt: { type: String, trim: true, maxlength: 400, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "KBCategory", index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ARTICLE_STATUSES, default: "draft", index: true },
    publishedAt: { type: Date },
    tags: [{ type: String, trim: true, maxlength: 50, lowercase: true }],
    isFaq: { type: Boolean, default: false, index: true },
    viewCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    seo: {
      title: { type: String, trim: true, maxlength: 160, default: "" },
      description: { type: String, trim: true, maxlength: 300, default: "" },
    },
    sortOrder: { type: Number, default: 0 },
    relatedArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: "KBArticle" }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

kbArticleSchema.index({ status: 1, publishedAt: -1 });
kbArticleSchema.index({ isFaq: 1, status: 1 });

export const KBArticle = mongoose.model("KBArticle", kbArticleSchema);
