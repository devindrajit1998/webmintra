/**
 * Knowledge Base Routes
 * /api/admin/kb
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { KBArticle, KBCategory, ARTICLE_STATUSES } from "../../models/KnowledgeBase.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, isString, stripUndefined } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ══ CATEGORIES ════════════════════════════════════════════════

router.get("/categories", async (req, res, next) => {
  try {
    const categories = await KBCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
});

router.post("/categories", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (!isString(b.name, { max: 80 })) return res.status(400).json({ message: "name is required." });
    if (!isString(b.slug, { max: 80 }) || !/^[a-z0-9-]+$/.test(b.slug)) return res.status(400).json({ message: "slug must be lowercase alphanumeric with hyphens." });
    if (await KBCategory.exists({ slug: b.slug.toLowerCase() })) return res.status(409).json({ message: "Slug already exists." });

    const category = await KBCategory.create({
      name: b.name.trim(), slug: b.slug.toLowerCase().trim(),
      description: b.description?.trim() || "", icon: b.icon?.trim() || "",
      sortOrder: b.sortOrder ?? 0, createdBy: req.user._id,
    });
    return res.status(201).json({ category });
  } catch (error) {
    return next(error);
  }
});

router.patch("/categories/:catId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.catId)) return res.status(400).json({ message: "Invalid ID." });
    const b = req.body ?? {};
    const update = stripUndefined({ name: b.name?.trim(), description: b.description?.trim(), icon: b.icon?.trim(), sortOrder: b.sortOrder, isActive: b.isActive });
    const category = await KBCategory.findByIdAndUpdate(req.params.catId, { $set: update }, { new: true });
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json({ category });
  } catch (error) {
    return next(error);
  }
});

router.delete("/categories/:catId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.catId)) return res.status(400).json({ message: "Invalid ID." });
    await KBCategory.findByIdAndDelete(req.params.catId);
    return res.json({ message: "Category deleted." });
  } catch (error) {
    return next(error);
  }
});

// ══ ARTICLES ══════════════════════════════════════════════════

router.get("/articles", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "publishedAt", "viewCount", "sortOrder"]);
    const filter = {};

    if (req.query.status && ARTICLE_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.category && isMongoId(req.query.category)) filter.category = req.query.category;
    if (req.query.isFaq === "true") filter.isFaq = true;
    if (req.query.search && typeof req.query.search === "string") {
      const { escapeRegex } = await import("../../lib/validate.js");
      filter.title = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
    }

    const [articles, total] = await Promise.all([
      KBArticle.find(filter).sort(sort).skip(skip).limit(limit)
        .populate("author", "name email")
        .populate("category", "name slug")
        .select("-content")
        .lean(),
      KBArticle.countDocuments(filter),
    ]);

    return res.json({ articles, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

router.get("/articles/:articleId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.articleId)) return res.status(400).json({ message: "Invalid ID." });
    const article = await KBArticle.findById(req.params.articleId)
      .populate("author", "name email")
      .populate("category", "name slug")
      .lean();
    if (!article) return res.status(404).json({ message: "Article not found." });
    return res.json({ article });
  } catch (error) {
    return next(error);
  }
});

router.post("/articles", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const errors = [];
    if (!isString(b.title, { max: 200 })) errors.push("title is required.");
    if (!isString(b.slug, { max: 200 }) || !/^[a-z0-9-]+$/.test(b.slug)) errors.push("slug must be lowercase alphanumeric with hyphens.");
    if (!isString(b.content, { min: 1, max: 1000000 })) errors.push("content is required.");
    if (errors.length) return res.status(400).json({ message: errors.join(" "), errors });

    if (await KBArticle.exists({ slug: b.slug.toLowerCase() }))
      return res.status(409).json({ message: "An article with this slug already exists." });

    const status = ARTICLE_STATUSES.includes(b.status) ? b.status : "draft";
    const article = await KBArticle.create({
      title: b.title.trim(), slug: b.slug.toLowerCase().trim(),
      content: b.content, excerpt: b.excerpt?.trim() || "",
      category: b.category && isMongoId(b.category) ? b.category : undefined,
      author: req.user._id, status,
      publishedAt: status === "published" ? new Date() : undefined,
      tags: Array.isArray(b.tags) ? b.tags.map((t) => t.toLowerCase().trim()).slice(0, 20) : [],
      isFaq: b.isFaq ?? false,
      seo: b.seo ?? {},
      sortOrder: b.sortOrder ?? 0,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "kb_article_published",
      description: `KB article "${article.title}" created (${status}).`,
      resource: { type: "kb_article", id: String(article._id), name: article.title },
    });

    return res.status(201).json({ article });
  } catch (error) {
    return next(error);
  }
});

router.patch("/articles/:articleId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.articleId)) return res.status(400).json({ message: "Invalid ID." });
    const b = req.body ?? {};
    const status = ARTICLE_STATUSES.includes(b.status) ? b.status : undefined;
    const update = stripUndefined({
      title: b.title?.trim(), excerpt: b.excerpt?.trim(), content: b.content,
      category: b.category && isMongoId(b.category) ? b.category : undefined,
      tags: Array.isArray(b.tags) ? b.tags.map((t) => t.toLowerCase().trim()) : undefined,
      status, isFaq: b.isFaq, seo: b.seo, sortOrder: b.sortOrder,
      publishedAt: status === "published" ? new Date() : undefined,
      updatedBy: req.user._id,
    });
    const article = await KBArticle.findByIdAndUpdate(req.params.articleId, { $set: update }, { new: true });
    if (!article) return res.status(404).json({ message: "Article not found." });
    return res.json({ article });
  } catch (error) {
    return next(error);
  }
});

router.delete("/articles/:articleId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.articleId)) return res.status(400).json({ message: "Invalid ID." });
    const article = await KBArticle.findByIdAndDelete(req.params.articleId);
    if (!article) return res.status(404).json({ message: "Article not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "kb_article_deleted",
      description: `KB article "${article.title}" deleted.`,
      resource: { type: "kb_article", id: String(article._id), name: article.title },
    });

    return res.json({ message: "Article deleted." });
  } catch (error) {
    return next(error);
  }
});

export default router;
