import "dotenv/config";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import {
  corsOptions,
  issueCsrfToken,
  requireCsrfToken,
  requireTrustedOrigin,
  validateProductionSecurityConfig,
} from "./middleware/security.js";

// ── Existing routes (Template Engine ecosystem — DO NOT MODIFY) ──
import authRouter from "./routes/auth.js";
import dashboardRouter from "./routes/dashboard.js";
import websitesRouter from "./routes/websites.js";
import templatesRouter from "./routes/templates.js";
import invitationsRouter from "./routes/invitations.js";
import tenantsRouter from "./routes/tenants.js";
import publicRouter from "./routes/public.js";
import domainsRouter from "./routes/domains.js";
import onboardingRouter from "./routes/onboarding.js";
import billingRouter from "./routes/billing.js";
import workspaceRouter from "./routes/workspace.js";

// ── Admin Platform Routes ──
import adminDashboardRouter from "./routes/admin/dashboard.js";
import adminTenantsRouter from "./routes/admin/tenants.js";
import adminPlansRouter from "./routes/admin/plans.js";
import adminSubscriptionsRouter from "./routes/admin/subscriptions.js";
import adminPaymentsRouter from "./routes/admin/payments.js";
import adminDomainsRouter from "./routes/admin/domains.js";
import adminWebsitesRouter from "./routes/admin/websites.js";
import adminBlogRouter from "./routes/admin/blog.js";
import adminKbRouter from "./routes/admin/kb.js";
import adminSupportRouter from "./routes/admin/support.js";
import adminAnnouncementsRouter from "./routes/admin/announcements.js";
import adminEmailTemplatesRouter from "./routes/admin/emailTemplates.js";
import adminNotificationsRouter from "./routes/admin/notifications.js";
import adminSettingsRouter, { publicRouter as publicSettingsRouter } from "./routes/admin/settings.js";
import adminActivityLogsRouter from "./routes/admin/activityLogs.js";
import adminProfileRouter from "./routes/admin/profile.js";
import adminReportsRouter from "./routes/admin/reports.js";
import adminSearchRouter from "./routes/admin/search.js";
import adminStorageRouter from "./routes/admin/storage.js";
import adminCouponsRouter from "./routes/admin/coupons.js";
import adminTemplatesRouter from "./routes/admin/templates.js";
import adminTemplateCategoriesRouter from "./routes/admin/templateCategories.js";
import adminTestimonialsRouter from "./routes/admin/testimonials.js";
import adminFaqsRouter from "./routes/admin/faqs.js";
import adminUploadRouter from "./routes/admin/upload.js";
import { initCronJobs } from "./services/cron.js";

// ── Environment Validation ──────────────────────────────────────
const required = ["MONGODB_URI", "JWT_SECRET", "OTP_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length)
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
if (process.env.JWT_SECRET.length < 32 || process.env.OTP_SECRET.length < 32)
  throw new Error("JWT_SECRET and OTP_SECRET must each be at least 32 characters.");
validateProductionSecurityConfig();

// ── App Setup ───────────────────────────────────────────────────
const app = express();
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://www.google.com", "https://www.gstatic.com", "https://checkout.razorpay.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "img-src": ["'self'", "data:", "https:", "http:"],
      "frame-src": ["'self'", "https://www.google.com", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      "connect-src": ["'self'", "https:", "http:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors(corsOptions()));
// Default body limit set to 2MB for general endpoints (specific high-volume routes like draft saves handle larger bodies safely)
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(requireTrustedOrigin);
app.use(requireCsrfToken);

// ── Rate Limiters ───────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again later." },
});

const onboardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many onboarding requests. Please wait a moment." },
});

const publicSubmissionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again in a few minutes." },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

// ── Existing Routes (DO NOT MODIFY ORDER OR PATHS) ─────────────
app.get("/api/csrf-token", (request, response) => {
  response.set("Cache-Control", "no-store");
  response.json({ csrfToken: issueCsrfToken(request, response) });
});
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/websites", websitesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/invitations", invitationsRouter);
app.use("/api/tenants", tenantsRouter);
app.use("/api/domains", domainsRouter);
app.use("/api/onboarding", onboardingLimiter, onboardingRouter);
app.use("/api/billing", billingRouter);
app.use("/api/workspace", workspaceRouter);

// ── Public Settings Endpoint (no auth) ─────────────────────────
app.use("/api/public/settings", publicSettingsRouter);

// ── Admin Platform Routes ───────────────────────────────────────
app.use("/api/admin", adminLimiter);
app.use("/api/admin/dashboard", adminDashboardRouter);
app.use("/api/admin/tenants", adminTenantsRouter);
app.use("/api/admin/plans", adminPlansRouter);
app.use("/api/admin/subscriptions", adminSubscriptionsRouter);
app.use("/api/admin/payments", adminPaymentsRouter);
app.use("/api/admin/domains", adminDomainsRouter);
app.use("/api/admin/websites", adminWebsitesRouter);
app.use("/api/admin/blog", adminBlogRouter);
app.use("/api/admin/kb", adminKbRouter);
app.use("/api/admin/support", adminSupportRouter);
app.use("/api/admin/announcements", adminAnnouncementsRouter);
app.use("/api/admin/email-templates", adminEmailTemplatesRouter);
app.use("/api/admin/notifications", adminNotificationsRouter);
app.use("/api/admin/settings", adminSettingsRouter);
app.use("/api/admin/activity-logs", adminActivityLogsRouter);
app.use("/api/admin/profile", adminProfileRouter);
app.use("/api/admin/reports", adminReportsRouter);
app.use("/api/admin/search", adminSearchRouter);
app.use("/api/admin/storage", adminStorageRouter);
app.use("/api/admin/coupons", adminCouponsRouter);
app.use("/api/admin/templates", adminTemplatesRouter);
app.use("/api/admin/template-categories", adminTemplateCategoriesRouter);
app.use("/api/admin/testimonials", adminTestimonialsRouter);
app.use("/api/admin/faqs", adminFaqsRouter);
app.use("/api/admin/upload", adminUploadRouter);

// ── Public APIs ──────────────────────────────────────────────────
app.use("/api/public", publicSubmissionsLimiter, publicRouter);

// ── Technical SEO: Dynamic Root Sitemap & Robots ─────────────────
app.get("/sitemap.xml", async (req, res, next) => {
  try {
    const { BlogPost } = await import("./models/Blog.js");
    const { Template } = await import("./models/Template.js");
    const { Setting } = await import("./models/Setting.js");
    const { KBArticle } = await import("./models/KnowledgeBase.js").catch(() => ({ KBArticle: null }));

    const host = req.get("x-forwarded-host") || req.get("host") || "webmintra.in";
    const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
    const baseUrl = `${protocol}://${host}`.replace(/\/$/, "");

    // Fetch site canonical setting if configured
    const canonicalSetting = await Setting.findOne({ key: "seo.canonicalUrl" }).lean();
    const siteOrigin = canonicalSetting?.value && typeof canonicalSetting.value === "string" && canonicalSetting.value.startsWith("http")
      ? canonicalSetting.value.replace(/\/$/, "")
      : baseUrl;

    // Core static platform pages
    const staticRoutes = [
      { loc: `${siteOrigin}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${siteOrigin}/templates`, priority: "0.9", changefreq: "weekly" },
      { loc: `${siteOrigin}/blog`, priority: "0.9", changefreq: "daily" },
      { loc: `${siteOrigin}/help`, priority: "0.8", changefreq: "weekly" },
      { loc: `${siteOrigin}/contact`, priority: "0.7", changefreq: "monthly" },
      { loc: `${siteOrigin}/privacy-policy`, priority: "0.5", changefreq: "monthly" },
      { loc: `${siteOrigin}/terms-and-conditions`, priority: "0.5", changefreq: "monthly" },
      { loc: `${siteOrigin}/refund-cancellation-policy`, priority: "0.5", changefreq: "monthly" },
    ];

    // Fetch published dynamic blog articles
    const blogPosts = await BlogPost.find({ status: "published" })
      .select("slug updatedAt publishedAt")
      .sort({ publishedAt: -1 })
      .lean();

    const blogRoutes = blogPosts.map((post) => ({
      loc: `${siteOrigin}/blog/${encodeURIComponent(post.slug)}`,
      lastmod: (post.updatedAt || post.publishedAt || new Date()).toISOString().split("T")[0],
      priority: "0.8",
      changefreq: "weekly",
    }));

    // Fetch published templates
    const templates = await Template.find({ isActive: true })
      .select("title category updatedAt")
      .lean();

    const templateRoutes = templates.map((tpl) => ({
      loc: `${siteOrigin}/templates?category=${encodeURIComponent(tpl.category || "all")}`,
      lastmod: (tpl.updatedAt || new Date()).toISOString().split("T")[0],
      priority: "0.7",
      changefreq: "weekly",
    }));

    // Combine all entries
    const allUrls = [...staticRoutes, ...blogRoutes, ...templateRoutes];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
        .map(
          (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq || "weekly"}</changefreq>
    <priority>${u.priority || "0.7"}</priority>
  </url>`
        )
        .join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.send(xml);
  } catch (err) {
    return next(err);
  }
});

app.get("/robots.txt", async (req, res, next) => {
  try {
    const { Setting } = await import("./models/Setting.js");
    const allowSetting = await Setting.findOne({ key: "seo.allowIndexing" }).lean();
    const isIndexingAllowed = allowSetting?.value !== false && allowSetting?.value !== "false";

    const host = req.get("x-forwarded-host") || req.get("host") || "webmintra.in";
    const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
    const siteOrigin = `${protocol}://${host}`.replace(/\/$/, "");

    if (!isIndexingAllowed) {
      res.set("Content-Type", "text/plain; charset=utf-8");
      return res.send(`User-agent: *\nDisallow: /\n`);
    }

    const robotsContent = `# Technical SEO robots.txt for WebMintra
User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /tenant/
Disallow: /api/
Disallow: /workspace/
Disallow: /sign-in
Disallow: /create-account
Disallow: /accept-invitation

User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /tenant/
Disallow: /api/
Disallow: /workspace/
Disallow: /sign-in
Disallow: /create-account
Disallow: /accept-invitation

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /tenant/
Disallow: /api/
Disallow: /workspace/
Disallow: /sign-in
Disallow: /create-account
Disallow: /accept-invitation

# Dynamic Sitemap Reference
Sitemap: ${siteOrigin}/sitemap.xml
`;

    res.set("Content-Type", "text/plain; charset=utf-8");
    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.send(robotsContent);
  } catch (err) {
    return next(err);
  }
});

// ── Health Check ────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
  });
});

// ── Global Error Handler ────────────────────────────────────────
app.use((error, _request, response, _next) => {
  console.error(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  // Never leak internal driver/database messages on 500 in production
  const message = status < 500 || process.env.NODE_ENV !== "production"
    ? error.message || "Unable to process your request."
    : "An unexpected error occurred. Please try again later.";

  response.status(status).json({ message });
});

// ── Start ───────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 5000);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => console.log(`API listening on ${port}`));
    initCronJobs();
  })
  .catch((error) => {
    console.error("Database connection failed.", error);
    process.exit(1);
  });
