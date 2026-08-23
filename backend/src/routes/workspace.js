import { Router } from "express";
import multer from "multer";
import { imagekit } from "../lib/imagekit.js";
import { requireAuthenticatedUser, requireRole, establishTenantContext } from "../middleware/auth.js";
import { ActivityLog, ACTIVITY_ACTIONS } from "../models/ActivityLog.js";
import { KBArticle, KBCategory } from "../models/KnowledgeBase.js";
import { SupportTicket, TICKET_PRIORITIES, TICKET_STATUSES } from "../models/SupportTicket.js";
import { Notification } from "../models/Notification.js";
import { buildLogContext, logActivity } from "../services/activityLog.js";
import { isMongoId, isString, parsePagination, stripUndefined } from "../lib/validate.js";
import { Website } from "../models/Website.js";
import { AnalyticsEvent } from "../models/AnalyticsEvent.js";
import { resolveTenantSeoEntitlements } from "../lib/tenant-seo-entitlements.js";
import { checkStorageLimit } from "../services/limits.js";
import { sanitizeRichHtml } from "../lib/sanitizeRichHtml.js";
import { compressUploadedImages } from "../middleware/imageCompressor.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit (compressed before storage)

router.use(requireAuthenticatedUser, requireRole("tenant"), establishTenantContext);

router.get("/notifications", async (req, res, next) => {
    try {
        const { limit } = parsePagination({ page: 1, limit: req.query.limit ?? 8 });
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ recipient: req.tenantId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .select("type title message link isRead readAt createdAt")
                .lean(),
            Notification.countDocuments({ recipient: req.tenantId, isRead: false }),
        ]);

        return res.json({
            notifications: notifications.map((notification) => ({
                ...notification,
                id: notification._id,
            })),
            unreadCount,
        });
    } catch (error) {
        return next(error);
    }
});

router.patch("/notifications/read-all", async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.tenantId, isRead: false },
            { isRead: true, readAt: new Date() },
        );
        return res.json({ message: "All notifications marked as read." });
    } catch (error) {
        return next(error);
    }
});

router.patch("/notifications/:notificationId/read", async (req, res, next) => {
    try {
        if (!isMongoId(req.params.notificationId)) {
            return res.status(400).json({ message: "Invalid notification ID." });
        }
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.notificationId, recipient: req.tenantId },
            { isRead: true, readAt: new Date() },
            { new: true },
        );
        if (!notification) return res.status(404).json({ message: "Notification not found." });
        return res.json({ message: "Notification marked as read." });
    } catch (error) {
        return next(error);
    }
});

router.get("/activity", async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = { actor: req.tenantId };

        if (req.query.action && ACTIVITY_ACTIONS.includes(req.query.action)) filter.action = req.query.action;
        if (isString(req.query.search, { max: 100 })) {
            filter.$or = [
                { description: { $regex: escapeRegex(req.query.search.trim()), $options: "i" } },
                { "resource.name": { $regex: escapeRegex(req.query.search.trim()), $options: "i" } },
            ];
        }

        const [logs, total] = await Promise.all([
            ActivityLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("action description resource metadata createdAt")
                .lean(),
            ActivityLog.countDocuments(filter),
        ]);

        return res.json({
            logs: logs.map((log) => ({ ...log, id: log._id })),
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/support", async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = { tenant: req.tenantId };

        if (req.query.status && TICKET_STATUSES.includes(req.query.status)) filter.status = req.query.status;
        if (isString(req.query.search, { max: 100 })) {
            const search = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
            filter.$or = [{ subject: search }, { ticketNumber: search }];
        }

        const [tickets, total, summary] = await Promise.all([
            SupportTicket.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
            SupportTicket.countDocuments(filter),
            SupportTicket.aggregate([
                { $match: { tenant: req.tenantId } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);

        return res.json({
            tickets: tickets.map(formatTenantTicket),
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
            summary: summary.reduce((result, item) => ({ ...result, [item._id]: item.count }), {}),
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/support", async (req, res, next) => {
    try {
        const body = req.body ?? {};
        if (!isString(body.subject, { min: 3, max: 200 })) {
            return res.status(400).json({ message: "Subject must be between 3 and 200 characters." });
        }
        if (!isString(body.description, { min: 10, max: 5000 })) {
            return res.status(400).json({ message: "Description must be between 10 and 5000 characters." });
        }

        const ticket = await SupportTicket.create({
            tenant: req.tenantId,
            subject: body.subject.trim(),
            description: body.description.trim(),
            priority: TICKET_PRIORITIES.includes(body.priority) ? body.priority : "medium",
            category: isString(body.category, { max: 80 }) ? body.category.trim() : "",
            attachments: Array.isArray(body.attachments) ? body.attachments : [],
        });

        await logActivity({
            ...buildLogContext(req),
            action: "ticket_created",
            description: `Support ticket ${ticket.ticketNumber} created.`,
            resource: { type: "support_ticket", id: String(ticket._id), name: ticket.ticketNumber },
        });

        return res.status(201).json({ ticket: formatTenantTicket(ticket.toObject()) });
    } catch (error) {
        return next(error);
    }
});

router.post("/support/upload", upload.single("file"), compressUploadedImages("standard"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const entitlements = await resolveTenantSeoEntitlements(req.user);
        const isAllowed = await checkStorageLimit(req.tenantId, req.file.size, entitlements.limits);
        if (!isAllowed) {
            return res.status(403).json({ message: `You have exceeded your plan's storage limit of ${entitlements.limits.storageMb}MB. Please upgrade your plan or delete some files.` });
        }

        const response = await imagekit.upload({
            file: req.file.buffer.toString("base64"),
            fileName: req.file.originalname || `upload_${Date.now()}`,
            folder: "/webmintra/support",
        });

        res.status(200).json({
            message: "File uploaded successfully",
            url: response.url,
            filename: response.name,
            size: response.size,
        });
    } catch (error) {
        console.error("Error uploading to ImageKit:", error);
        res.status(500).json({ message: "Failed to upload image" });
    }
});

router.get("/support/:ticketId", async (req, res, next) => {
    try {
        if (!isMongoId(req.params.ticketId)) return res.status(400).json({ message: "Invalid ticket ID." });
        const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, tenant: req.tenantId })
            .populate("replies.author", "name role")
            .lean();
        if (!ticket) return res.status(404).json({ message: "Ticket not found." });
        return res.json({ ticket: formatTenantTicket(ticket) });
    } catch (error) {
        return next(error);
    }
});

router.post("/support/:ticketId/reply", async (req, res, next) => {
    try {
        if (!isMongoId(req.params.ticketId)) return res.status(400).json({ message: "Invalid ticket ID." });
        if (!isString(req.body?.content, { min: 1, max: 5000 })) {
            return res.status(400).json({ message: "Reply content is required (max 5000 characters)." });
        }

        const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, tenant: req.tenantId });
        if (!ticket) return res.status(404).json({ message: "Ticket not found." });
        if (ticket.status === "closed") return res.status(409).json({ message: "Closed tickets cannot receive replies." });

        ticket.replies.push({
            author: req.tenantId,
            content: req.body.content.trim(),
            isInternal: false,
            attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
        });
        ticket.lastRepliedAt = new Date();
        ticket.lastRepliedBy = req.tenantId;
        if (["resolved", "waiting_reply"].includes(ticket.status)) ticket.status = "open";
        await ticket.save();

        const admins = await req.user.constructor.find({ role: "admin", isEmailVerified: true }).select("_id").lean();
        if (admins.length) {
            await Notification.insertMany(admins.map((admin) => ({
                recipient: admin._id,
                type: "ticket",
                title: `Tenant replied to ${ticket.ticketNumber}`,
                message: ticket.subject,
                link: `/admin/support`,
            })));
        }

        await logActivity({
            ...buildLogContext(req),
            action: "ticket_replied",
            description: `Reply added to support ticket ${ticket.ticketNumber}.`,
            resource: { type: "support_ticket", id: String(ticket._id), name: ticket.ticketNumber },
        });

        return res.json({ message: "Reply sent.", ticket: formatTenantTicket(ticket.toObject()) });
    } catch (error) {
        return next(error);
    }
});

router.get("/kb/categories", async (_req, res, next) => {
    try {
        const categories = await KBCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
        return res.json({ categories: categories.map((category) => ({ ...category, id: category._id })) });
    } catch (error) {
        return next(error);
    }
});

router.get("/kb/articles", async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = { status: "published" };
        if (req.query.category && isMongoId(req.query.category)) filter.category = req.query.category;
        if (req.query.isFaq === "true") filter.isFaq = true;
        if (isString(req.query.search, { max: 100 })) {
            const search = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
            filter.$or = [{ title: search }, { excerpt: search }, { tags: search }];
        }

        const [articles, total] = await Promise.all([
            KBArticle.find(filter)
                .sort({ sortOrder: 1, publishedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("category", "name slug")
                .select("title slug excerpt category tags isFaq viewCount helpfulCount notHelpfulCount publishedAt updatedAt")
                .lean(),
            KBArticle.countDocuments(filter),
        ]);
        return res.json({
            articles: articles.map((article) => ({ ...article, id: article._id })),
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/kb/articles/:articleId", async (req, res, next) => {
    try {
        if (!isMongoId(req.params.articleId)) return res.status(400).json({ message: "Invalid article ID." });
        const article = await KBArticle.findOneAndUpdate(
            { _id: req.params.articleId, status: "published" },
            { $inc: { viewCount: 1 } },
            { new: true },
        ).populate("category", "name slug").lean();
        if (!article) return res.status(404).json({ message: "Article not found." });
        return res.json({ article: { ...article, id: article._id } });
    } catch (error) {
        return next(error);
    }
});

router.post("/kb/articles/:articleId/feedback", async (req, res, next) => {
    try {
        if (!isMongoId(req.params.articleId)) return res.status(400).json({ message: "Invalid article ID." });
        if (!["helpful", "not_helpful"].includes(req.body?.rating)) {
            return res.status(400).json({ message: "Feedback rating is invalid." });
        }
        const field = req.body.rating === "helpful" ? "helpfulCount" : "notHelpfulCount";
        const article = await KBArticle.findOneAndUpdate(
            { _id: req.params.articleId, status: "published" },
            { $inc: { [field]: 1 } },
            { new: true },
        ).select("helpfulCount notHelpfulCount").lean();
        if (!article) return res.status(404).json({ message: "Article not found." });
        return res.json({ message: "Feedback recorded.", helpfulCount: article.helpfulCount, notHelpfulCount: article.notHelpfulCount });
    } catch (error) {
        return next(error);
    }
});

export function formatTenantTicket(ticket) {
    return {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        replies: (ticket.replies ?? [])
            .filter((reply) => !reply.isInternal)
            .map((reply) => ({
                id: reply._id,
                content: reply.content,
                author: reply.author && typeof reply.author === "object" && (reply.author.name || reply.author.role)
                    ? { id: reply.author._id, name: reply.author.name, role: reply.author.role }
                    : { id: reply.author },
                createdAt: reply.createdAt,
            })),
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        lastRepliedAt: ticket.lastRepliedAt,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
    };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// Analytics (Tenant Scope)
// ==========================================

router.get("/analytics", async (req, res, next) => {
    try {
        const requestedDays = Number.parseInt(String(req.query.days || "30"), 10);
        const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
        const from = new Date();
        from.setUTCHours(0, 0, 0, 0);
        from.setUTCDate(from.getUTCDate() - days + 1);
        const match = { tenant: req.tenantId, occurredAt: { $gte: from } };

        const [summaryRows, dailyRows, websiteRows] = await Promise.all([
            AnalyticsEvent.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
                        conversions: { $sum: { $cond: [{ $eq: ["$type", "conversion"] }, 1, 0] } },
                        visitors: { $addToSet: "$visitorId" },
                    },
                },
                { $project: { _id: 0, pageViews: 1, conversions: 1, uniqueVisitors: { $size: "$visitors" } } },
            ]),
            AnalyticsEvent.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt", timezone: "UTC" } }, visitorId: "$visitorId" },
                        pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
                        conversions: { $sum: { $cond: [{ $eq: ["$type", "conversion"] }, 1, 0] } },
                    },
                },
                { $group: { _id: "$_id.date", visitors: { $sum: 1 }, pageViews: { $sum: "$pageViews" }, conversions: { $sum: "$conversions" } } },
                { $sort: { _id: 1 } },
            ]),
            AnalyticsEvent.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { website: "$website", visitorId: "$visitorId" },
                        pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
                        conversions: { $sum: { $cond: [{ $eq: ["$type", "conversion"] }, 1, 0] } },
                    },
                },
                { $group: { _id: "$_id.website", visitors: { $sum: 1 }, pageViews: { $sum: "$pageViews" }, conversions: { $sum: "$conversions" } } },
                { $lookup: { from: "websites", localField: "_id", foreignField: "_id", as: "website" } },
                { $unwind: "$website" },
                { $project: { _id: 0, websiteId: "$_id", websiteName: "$website.name", visitors: 1, pageViews: 1, conversions: 1 } },
                { $sort: { pageViews: -1 } },
            ]),
        ]);

        const dailyByDate = new Map(dailyRows.map((row) => [row._id, row]));
        const daily = Array.from({ length: days }, (_, index) => {
            const date = new Date(from);
            date.setUTCDate(from.getUTCDate() + index);
            const label = date.toISOString().slice(0, 10);
            const row = dailyByDate.get(label);
            return { date: label, visitors: row?.visitors ?? 0, pageViews: row?.pageViews ?? 0, conversions: row?.conversions ?? 0 };
        });

        return res.json({
            period: { days, from: from.toISOString(), to: new Date().toISOString() },
            summary: summaryRows[0] ?? { uniqueVisitors: 0, pageViews: 0, conversions: 0 },
            daily,
            websites: websiteRows,
        });
    } catch (error) {
        return next(error);
    }
});

// ==========================================
// Pages & Blog (Tenant Website Scope)
// ==========================================

// Middleware to verify website ownership before accessing website-specific resources
async function requireWebsiteOwnership(req, res, next) {
    const websiteId = req.params.websiteId;
    if (!isMongoId(websiteId)) return res.status(400).json({ message: "Invalid website ID." });

    const website = await Website.findOne({ _id: websiteId, owner: req.tenantId }).lean();
    if (!website) return res.status(404).json({ message: "Website not found or access denied." });

    req.website = website;
    next();
}

// Get Pages (Read-only from GrapeJS draft state)
router.get("/websites/:websiteId/pages", requireWebsiteOwnership, async (req, res, next) => {
    try {
        const state = req.website.draftState || {};
        let pages = state.pages;

        // Fallback to template pages if draftState has no pages
        if (!pages || pages.length === 0) {
            // Need to populate templateId if it's a valid MongoId
            if (isMongoId(req.website.templateId)) {
                await Website.populate(req.website, { path: 'templateId', select: 'pages' });
                if (req.website.templateId && req.website.templateId.pages) {
                    pages = req.website.templateId.pages;
                }
            }
        }

        pages = pages || [];

        // Extract basic page info to send to frontend
        const mappedPages = pages.map((p) => ({
            id: p.id || Math.random().toString(), // GrapeJS pages usually have IDs
            name: p.name || "Untitled",
            type: p.type || "main",
        }));

        // If there are no pages at all, add a default index page
        if (mappedPages.length === 0) {
            mappedPages.push({ id: "default", name: "index.html", type: "main" });
        }

        return res.json({ pages: mappedPages });
    } catch (error) {
        return next(error);
    }
});

// Blog Posts CRUD
router.get("/websites/:websiteId/blog", requireWebsiteOwnership, async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = { website: req.params.websiteId };

        if (req.query.status && TENANT_POST_STATUSES.includes(req.query.status)) filter.status = req.query.status;
        if (isString(req.query.search, { max: 100 })) {
            filter.title = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
        }

        const [posts, total] = await Promise.all([
            TenantBlogPost.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("author", "name")
                .lean(),
            TenantBlogPost.countDocuments(filter),
        ]);

        return res.json({
            posts: posts.map(p => ({ ...p, id: p._id })),
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/websites/:websiteId/blog", requireWebsiteOwnership, async (req, res, next) => {
    try {
        const body = req.body || {};
        if (!isString(body.title, { min: 1, max: 200 })) return res.status(400).json({ message: "Title is required." });

        const slug = isString(body.slug) ? body.slug : body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const existing = await TenantBlogPost.findOne({ website: req.params.websiteId, slug }).lean();
        if (existing) return res.status(400).json({ message: "A post with this slug already exists for this website." });

        const post = await TenantBlogPost.create({
            website: req.params.websiteId,
            author: req.user._id,
            title: body.title,
            slug,
            excerpt: body.excerpt || "",
            content: sanitizeRichHtml(body.content || ""),
            status: TENANT_POST_STATUSES.includes(body.status) ? body.status : "draft",
            seo: body.seo || {},
        });

        return res.status(201).json({ post: { ...post.toObject(), id: post._id } });
    } catch (error) {
        return next(error);
    }
});

router.patch("/websites/:websiteId/blog/:postId", requireWebsiteOwnership, async (req, res, next) => {
    try {
        if (!isMongoId(req.params.postId)) return res.status(400).json({ message: "Invalid post ID." });

        const updates = stripUndefined({
            title: isString(req.body.title) ? req.body.title : undefined,
            slug: isString(req.body.slug) ? req.body.slug : undefined,
            content: isString(req.body.content) ? sanitizeRichHtml(req.body.content) : undefined,
            excerpt: isString(req.body.excerpt) ? req.body.excerpt : undefined,
            status: TENANT_POST_STATUSES.includes(req.body.status) ? req.body.status : undefined,
            seo: req.body.seo,
            updatedBy: req.user._id,
        });

        const post = await TenantBlogPost.findOneAndUpdate(
            { _id: req.params.postId, website: req.params.websiteId },
            { $set: updates },
            { new: true }
        ).lean();

        if (!post) return res.status(404).json({ message: "Post not found." });

        return res.json({ post: { ...post, id: post._id } });
    } catch (error) {
        return next(error);
    }
});

router.delete("/websites/:websiteId/blog/:postId", requireWebsiteOwnership, async (req, res, next) => {
    try {
        if (!isMongoId(req.params.postId)) return res.status(400).json({ message: "Invalid post ID." });

        const deleted = await TenantBlogPost.findOneAndDelete({ _id: req.params.postId, website: req.params.websiteId });
        if (!deleted) return res.status(404).json({ message: "Post not found." });

        return res.json({ success: true, message: "Post deleted successfully." });
    } catch (error) {
        return next(error);
    }
});

export default router;
