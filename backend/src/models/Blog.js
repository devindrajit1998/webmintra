import mongoose from "mongoose";

export const POST_STATUSES = ["draft", "published", "scheduled", "archived"];

const blogCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80, unique: true },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "BlogCategory", default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const BlogCategory = mongoose.model("BlogCategory", blogCategorySchema);

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 200, unique: true, index: true },
    excerpt: { type: String, trim: true, maxlength: 500, default: "" },
    content: { type: String, required: true },
    coverImage: { type: String, trim: true, maxlength: 2048, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "BlogCategory" },
    tags: [{ type: String, trim: true, maxlength: 50, lowercase: true }],
    status: { type: String, enum: POST_STATUSES, default: "draft", index: true },
    publishedAt: { type: Date, index: true },
    scheduledAt: { type: Date },
    seo: {
      title: { type: String, trim: true, maxlength: 160, default: "" },
      description: { type: String, trim: true, maxlength: 300, default: "" },
      keywords: [{ type: String, trim: true, maxlength: 50 }],
      ogImage: { type: String, trim: true, maxlength: 2048, default: "" },
    },
    readTimeMinutes: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },
    commentCount: { type: Number, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1 });

export const BlogPost = mongoose.model("BlogPost", blogPostSchema);
