/**
 * Blog Management Routes
 * /api/admin/blog
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { BlogPost, BlogCategory, POST_STATUSES } from "../../models/Blog.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, isString, stripUndefined } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ══ CATEGORIES ════════════════════════════════════════════════

router.get("/categories", async (req, res, next) => {
  try {
    const categories = await BlogCategory.find().sort({ sortOrder: 1, name: 1 }).lean();
    // Count posts in each category
    const categoryCounts = await BlogPost.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = categoryCounts.reduce((acc, curr) => {
      if (curr._id) acc[String(curr._id)] = curr.count;
      return acc;
    }, {});

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      postCount: countMap[String(cat._id)] || 0,
    }));

    return res.json({ categories: categoriesWithCount });
  } catch (error) {
    return next(error);
  }
});

router.post("/categories", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (!isString(b.name, { max: 80 })) return res.status(400).json({ message: "name is required (max 80 chars)." });
    if (!isString(b.slug, { max: 80 }) || !/^[a-z0-9-]+$/.test(b.slug)) return res.status(400).json({ message: "slug must be lowercase alphanumeric with hyphens." });

    if (await BlogCategory.exists({ slug: b.slug.toLowerCase().trim() }))
      return res.status(409).json({ message: "A category with this slug already exists." });

    const category = await BlogCategory.create({
      name: b.name.trim(),
      slug: b.slug.toLowerCase().trim(),
      description: b.description?.trim() || "",
      sortOrder: b.sortOrder ?? 0,
      createdBy: req.user._id,
    });

    return res.status(201).json({ category });
  } catch (error) {
    return next(error);
  }
});

router.patch("/categories/:catId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.catId)) return res.status(400).json({ message: "Invalid category ID." });
    const b = req.body ?? {};
    
    if (b.slug) {
      const cleanSlug = b.slug.toLowerCase().trim();
      const existing = await BlogCategory.findOne({ slug: cleanSlug, _id: { $ne: req.params.catId } });
      if (existing) {
        return res.status(409).json({ message: "A category with this slug already exists." });
      }
    }

    const update = stripUndefined({
      name: b.name?.trim(),
      slug: b.slug?.toLowerCase()?.trim(),
      description: b.description?.trim(),
      sortOrder: b.sortOrder,
      isActive: b.isActive,
    });
    const category = await BlogCategory.findByIdAndUpdate(req.params.catId, { $set: update }, { new: true });
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json({ category });
  } catch (error) {
    return next(error);
  }
});

router.delete("/categories/:catId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.catId)) return res.status(400).json({ message: "Invalid category ID." });
    await BlogCategory.findByIdAndDelete(req.params.catId);
    return res.json({ message: "Category deleted." });
  } catch (error) {
    return next(error);
  }
});

// ══ POSTS ═════════════════════════════════════════════════════

router.get("/posts", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "publishedAt", "viewCount"]);
    const filter = {};

    if (req.query.status && POST_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.category && isMongoId(req.query.category)) filter.category = req.query.category;
    if (req.query.featured === "true") filter.featured = true;
    if (req.query.search && typeof req.query.search === "string") {
      const { escapeRegex } = await import("../../lib/validate.js");
      filter.title = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
    }

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("author", "name email")
        .populate("category", "name slug")
        .lean(),
      BlogPost.countDocuments(filter),
    ]);

    return res.json({ posts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

router.get("/posts/:postId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.postId)) return res.status(400).json({ message: "Invalid post ID." });
    const post = await BlogPost.findById(req.params.postId)
      .populate("author", "name email")
      .populate("category", "name slug")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found." });
    return res.json({ post });
  } catch (error) {
    return next(error);
  }
});

router.post("/posts", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const errors = [];
    if (!isString(b.title, { max: 200 })) errors.push("title is required.");
    if (!isString(b.slug, { max: 200 }) || !/^[a-z0-9-]+$/.test(b.slug)) errors.push("slug must be lowercase alphanumeric with hyphens.");
    if (!isString(b.content, { min: 1, max: 1000000 })) errors.push("content is required.");
    if (errors.length) return res.status(400).json({ message: errors.join(" "), errors });

    if (await BlogPost.exists({ slug: b.slug.toLowerCase() }))
      return res.status(409).json({ message: "A post with this slug already exists." });

    const status = POST_STATUSES.includes(b.status) ? b.status : "draft";
    const publishedAt = status === "published" ? (b.publishedAt ? new Date(b.publishedAt) : new Date()) : undefined;

    const post = await BlogPost.create({
      title: b.title.trim(),
      slug: b.slug.toLowerCase().trim(),
      excerpt: b.excerpt?.trim() || "",
      content: b.content,
      coverImage: b.coverImage?.trim() || "",
      author: req.user._id,
      category: b.category && isMongoId(b.category) ? b.category : undefined,
      tags: Array.isArray(b.tags) ? b.tags.map((t) => t.toLowerCase().trim()).slice(0, 20) : [],
      status,
      publishedAt,
      scheduledAt: status === "scheduled" && b.scheduledAt ? new Date(b.scheduledAt) : undefined,
      seo: b.seo ?? {},
      featured: b.featured ?? false,
      allowComments: b.allowComments ?? true,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "blog_post_published",
      description: `Blog post "${post.title}" created (${status}).`,
      resource: { type: "blog_post", id: String(post._id), name: post.title },
    });

    return res.status(201).json({ post });
  } catch (error) {
    return next(error);
  }
});

router.patch("/posts/:postId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.postId)) return res.status(400).json({ message: "Invalid post ID." });
    const b = req.body ?? {};
    const status = POST_STATUSES.includes(b.status) ? b.status : undefined;
    
    if (b.slug) {
      const slugClean = b.slug.toLowerCase().trim();
      const existing = await BlogPost.findOne({ slug: slugClean, _id: { $ne: req.params.postId } });
      if (existing) {
        return res.status(409).json({ message: "A post with this slug already exists." });
      }
    }

    const update = stripUndefined({
      title: b.title?.trim(),
      slug: b.slug?.toLowerCase()?.trim(),
      excerpt: b.excerpt?.trim(),
      content: b.content,
      coverImage: b.coverImage?.trim(),
      category: b.category && isMongoId(b.category) ? b.category : undefined,
      tags: Array.isArray(b.tags) ? b.tags.map((t) => t.toLowerCase().trim()) : undefined,
      status,
      publishedAt: status === "published" ? (b.publishedAt ? new Date(b.publishedAt) : new Date()) : undefined,
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : undefined,
      seo: b.seo,
      featured: b.featured,
      allowComments: b.allowComments,
      updatedBy: req.user._id,
    });

    const post = await BlogPost.findByIdAndUpdate(req.params.postId, { $set: update }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found." });

    return res.json({ post });
  } catch (error) {
    return next(error);
  }
});

router.delete("/posts/:postId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.postId)) return res.status(400).json({ message: "Invalid post ID." });
    const post = await BlogPost.findByIdAndDelete(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "blog_post_deleted",
      description: `Blog post "${post.title}" deleted.`,
      resource: { type: "blog_post", id: String(post._id), name: post.title },
    });

    return res.json({ message: "Post deleted." });
  } catch (error) {
    return next(error);
  }
});

export default router;
