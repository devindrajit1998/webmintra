import mongoose from "mongoose";

export const TENANT_POST_STATUSES = ["draft", "published", "scheduled", "archived"];

const tenantBlogPostSchema = new mongoose.Schema(
  {
    website: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    excerpt: { type: String, trim: true, maxlength: 500, default: "" },
    content: { type: String, required: true },
    coverImage: { type: String, trim: true, maxlength: 2048, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: String, trim: true, maxlength: 50, lowercase: true }],
    status: { type: String, enum: TENANT_POST_STATUSES, default: "draft", index: true },
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

tenantBlogPostSchema.index({ website: 1, slug: 1 }, { unique: true });
tenantBlogPostSchema.index({ website: 1, status: 1, publishedAt: -1 });

export const TenantBlogPost = mongoose.model("TenantBlogPost", tenantBlogPostSchema);
