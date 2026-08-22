import { Router } from "express";
import { JSDOM } from "jsdom";
import { Website } from "../models/Website.js";
import { Template } from "../models/Template.js";
import { Plan } from "../models/Plan.js";
import { User } from "../models/User.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { AnalyticsEvent, ANALYTICS_EVENT_TYPES } from "../models/AnalyticsEvent.js";
import { Domain } from "../models/Domain.js";
import { WebsitePlugin } from "../models/WebsitePlugin.js";
import { generatePluginInjections } from "../lib/plugin-injectors.js";
import {
  buildPublicPages,
  buildSitemapXml,
  findPageById,
  findPublicPage,
  findRedirect,
  mergedPageSeo,
  normalizePublicPath,
  pageStateValue,
} from "../lib/public-site.js";

const router = Router();
const WEBSITE_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeFormData(data) {
  if (typeof data !== "object" || data === null) return {};
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      String(key).slice(0, 100),
      typeof value === "string" ? value.slice(0, 5000) : value,
    ])
  );
}

// ── Public Templates Showcase ──────────────────────────────────
router.get("/templates", async (req, res) => {
  try {
    const { category, limit } = req.query;
    const filter = { isActive: true };
    if (category && typeof category === "string" && category.trim() && category.toLowerCase() !== "all") {
      filter.category = { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, "i") };
    }
    const query = Template.find(filter)
      .sort({ createdAt: -1 })
      .select("title description category thumbnailUrl pageCount assets pages");
    
    if (limit) {
      query.limit(Math.min(100, Number(limit) || 10));
    }
    const templates = await query.lean();
    return res.json({ templates });
  } catch (error) {
    console.error("Error fetching public templates:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Public Single Template Preview ────────────────────────────
router.get("/templates/:id", async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    return res.json({ template });
  } catch (error) {
    console.error("Error fetching template preview:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Public Template Categories ─────────────────────────────────
router.get("/template-categories", async (req, res) => {
  try {
    const categories = await Template.distinct("category", { isActive: true });
    return res.json({ categories: categories.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching template categories:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Public Pricing Plans ───────────────────────────────────────
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find({ status: "active", isPublic: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select("name slug description pricing currency trialDays limits features highlights isPopular sortOrder")
      .lean();
    return res.json({ plans });
  } catch (error) {
    console.error("Error fetching public plans:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Public Blog ────────────────────────────────────────────────
router.get("/blog", async (req, res) => {
  try {
    const { BlogPost, BlogCategory } = await import("../models/Blog.js");
    const { category, search, limit = 20 } = req.query;
    const filter = { status: "published" };

    if (category && category !== "all") {
      const catDoc = await BlogCategory.findOne({ slug: category });
      if (catDoc) filter.category = catDoc._id;
    }

    if (search && typeof search === "string" && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { excerpt: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const posts = await BlogPost.find(filter)
      .populate("category", "name slug")
      .populate("author", "name email")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(Number(limit) || 20)
      .lean();

    const categories = await BlogCategory.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    return res.json({ posts, categories });
  } catch (error) {
    console.error("Error fetching public blog:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/blog/:slug", async (req, res) => {
  try {
    const { BlogPost } = await import("../models/Blog.js");
    const slug = String(req.params.slug).toLowerCase().trim();
    let post = await BlogPost.findOne({ slug, status: "published" })
      .populate("category", "name slug")
      .populate("author", "name email")
      .lean();

    if (!post) {
      // Check if draft post exists (for preview)
      post = await BlogPost.findOne({ slug })
        .populate("category", "name slug")
        .populate("author", "name email")
        .lean();
    }

    if (!post) return res.status(404).json({ message: "Article not found" });

    // increment view count if published
    if (post.status === "published") {
      await BlogPost.updateOne({ _id: post._id }, { $inc: { viewCount: 1 } });
    }
    return res.json({ post });
  } catch (error) {
    console.error("Error fetching article:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Public Knowledge Base ──────────────────────────────────────
router.get("/kb", async (req, res) => {
  try {
    const { KBArticle, KBCategory } = await import("../models/KnowledgeBase.js");
    const { category, search } = req.query;
    const filter = { status: "published" };

    if (category && category !== "all") {
      const catDoc = await KBCategory.findOne({ slug: category });
      if (catDoc) filter.category = catDoc._id;
    }

    if (search && typeof search === "string" && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { excerpt: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const articles = await KBArticle.find(filter)
      .populate("category", "name slug icon")
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    const categories = await KBCategory.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    return res.json({ articles, categories });
  } catch (error) {
    console.error("Error fetching public KB:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/kb/:slug", async (req, res) => {
  try {
    const { KBArticle } = await import("../models/KnowledgeBase.js");
    const article = await KBArticle.findOne({ slug: req.params.slug, status: "published" })
      .populate("category", "name slug icon")
      .lean();

    if (!article) return res.status(404).json({ message: "Article not found" });

    await KBArticle.updateOne({ _id: article._id }, { $inc: { views: 1 } });
    return res.json({ article });
  } catch (error) {
    console.error("Error fetching KB article:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Public Contact Form Submission ────────────────────────────
router.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message, recaptchaToken } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required." });
    }

    const { verifyRecaptcha } = await import("../services/recaptcha.js");
    const recapResult = await verifyRecaptcha(recaptchaToken, req.ip, "contact");
    if (!recapResult.success) {
      return res.status(400).json({ message: recapResult.error || "Security verification failed." });
    }

    const { SupportTicket } = await import("../models/Support.js").catch(() => ({}));
    if (SupportTicket) {
      await SupportTicket.create({
        subject: String(subject || `Website Pre-Sales Enquiry from ${name}`).slice(0, 200),
        description: `Name: ${String(name).slice(0, 100)}\nEmail: ${String(email).slice(0, 100)}\nPhone: ${String(phone || "N/A").slice(0, 30)}\n\nMessage:\n${String(message).slice(0, 5000)}`,
        category: "general",
        priority: "medium",
        status: "open",
      });
    }

    return res.status(201).json({ message: "Enquiry submitted successfully! Our team will contact you shortly." });
  } catch (error) {
    console.error("Error saving contact message:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Public FAQs ────────────────────────────────────────────────
router.get("/faqs", async (req, res) => {
  try {
    const { FAQ, DEFAULT_FAQS } = await import("../models/Faq.js");
    const count = await FAQ.countDocuments();
    if (count === 0) {
      await FAQ.insertMany(DEFAULT_FAQS);
    }
    const faqs = await FAQ.find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return res.json({ faqs });
  } catch (error) {
    console.error("Error fetching public FAQs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Public Testimonials ────────────────────────────────────────
router.get("/testimonials", async (req, res) => {
  try {
    const { Testimonial, DEFAULT_TESTIMONIALS } = await import("../models/Testimonial.js");
    const count = await Testimonial.countDocuments();
    if (count === 0) {
      await Testimonial.insertMany(DEFAULT_TESTIMONIALS);
    }
    const testimonials = await Testimonial.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ testimonials });
  } catch (error) {
    console.error("Error fetching public testimonials:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

function sanitizeCssValue(v) {
  if (typeof v !== "string") return "";
  return v.replace(/[;{}()<>\\]/g, "").slice(0, 200);
}

function themeCss(theme) {
  if (!theme || typeof theme !== "object") return "";
  const fontBody = sanitizeCssValue(theme.fontBody);
  const fontHeading = sanitizeCssValue(theme.fontHeading);
  const background = sanitizeCssValue(theme.background);
  const text = sanitizeCssValue(theme.text);
  const radius = sanitizeCssValue(theme.radius);
  const shadow = sanitizeCssValue(theme.shadow);
  const container = sanitizeCssValue(theme.container);

  return `
    body { ${fontBody ? `font-family: ${fontBody} !important;` : ""} ${background ? `background: ${background} !important;` : ""} ${text ? `color: ${text} !important;` : ""} }
    ${fontHeading ? `h1,h2,h3,h4,h5 { font-family: ${fontHeading} !important; }` : ""}
    ${radius ? `.card, .btn-primary, .btn-secondary, input, textarea, button { border-radius: ${radius} !important; }` : ""}
    ${shadow ? `.card { box-shadow: ${shadow}; }` : ""}
    ${container ? `.sect { max-width: ${container} !important; }` : ""}
  `;
}

function applyEdit(element, edit) {
  if (edit.text !== undefined && element.children.length === 0) element.textContent = edit.text;
  else if (edit.text !== undefined) {
    const target = element.querySelector("span,strong,em") ?? element;
    if (target.children.length === 0) target.textContent = edit.text;
  }
  for (const attribute of ["src", "alt", "title", "href", "target", "loading", "placeholder", "poster"]) {
    if (edit[attribute] !== undefined) element.setAttribute(attribute, edit[attribute]);
  }
  for (const attribute of ["autoplay", "controls", "muted", "loop"]) {
    if (edit[attribute] === undefined) continue;
    if (edit[attribute]) element.setAttribute(attribute, "");
    else element.removeAttribute(attribute);
  }
  if (edit.fill) Array.from(element.querySelectorAll("path,circle,rect,polygon")).forEach((node) => node.setAttribute("fill", edit.fill));
  if (edit.stroke) Array.from(element.querySelectorAll("path,circle,rect,polygon")).forEach((node) => node.setAttribute("stroke", edit.stroke));
  if (edit.hidden) element.setAttribute("style", `${element.getAttribute("style") ?? ""};display:none !important`);
  if (edit.style) {
    const extra = Object.entries(edit.style).filter(([, value]) => value !== "").map(([key, value]) => `${key}:${value}`).join(";");
    if (extra) element.setAttribute("style", `${element.getAttribute("style") ?? ""};${extra}`);
  }
}

async function resolvePublishedWebsite(domainOrId) {
  if (!domainOrId) return null;

  // 1. Direct MongoDB Website ID Match
  if (WEBSITE_ID_PATTERN.test(domainOrId)) {
    const site = await Website.findOne({ _id: domainOrId, status: "published" }).populate("templateId", "htmlContent pages");
    if (site) return site;
  }

  // 2. Custom Domain Match (e.g. clientdomain.com or mybrand.in)
  const domain = await Domain.findOne({ domain: domainOrId.toLowerCase(), status: "active" }).populate({
    path: "website",
    match: { status: "published" },
    populate: { path: "templateId", select: "htmlContent pages" },
  });
  if (domain?.website && String(domain.tenant) === String(domain.website.owner)) {
    return domain.website;
  }

  // 3. Business Name / Subdomain Slug Match (e.g., "webmintra", "lens-and-light")
  // Check if a tenant's business name matches the subdomain slug
  const normalizedSlug = domainOrId.toLowerCase().replace(/[^a-z0-9]/g, "");
  const tenants = await User.find({ role: "tenant" }).select("_id name business").lean();
  
  const matchedTenant = tenants.find((t) => {
    const bizName = t.business?.name ? t.business.name.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const userName = t.name ? t.name.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    return (bizName && (bizName === normalizedSlug || bizName.includes(normalizedSlug) || normalizedSlug.includes(bizName))) ||
           (userName && (userName === normalizedSlug || userName.includes(normalizedSlug)));
  });

  if (matchedTenant) {
    const site = await Website.findOne({ owner: matchedTenant._id, status: "published" })
      .sort({ updatedAt: -1 })
      .populate("templateId", "htmlContent pages");
    if (site) return site;
  }

  // 4. Website Name Slug Match
  const siteByName = await Website.findOne({
    status: "published",
    name: { $regex: new RegExp(`^${escapeRegex(domainOrId.replace(/-/g, " "))}$`, "i") },
  }).populate("templateId", "htmlContent pages");
  if (siteByName) return siteByName;

  return null;
}

export function publicBaseUrl(req) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = forwardedHost || req.get("host");
  const origin = `${protocol}://${host}`;
  return WEBSITE_ID_PATTERN.test(req.params.domainOrId)
    ? `${origin}/api/public/site/${encodeURIComponent(req.params.domainOrId)}`
    : origin;
}

function applyRepeaters(document, repeaters) {
  Object.entries(repeaters || {}).forEach(([repeaterId, items]) => {
    if (!Array.isArray(items)) return;
    const container = document.querySelector(`[data-te-id="${repeaterId}"]`) || document.querySelector(`[data-te-repeater-id="${repeaterId}"]`)?.parentElement;
    if (!container) return;
    const originals = Array.from(container.children).filter((child) => child.hasAttribute("data-te-id"));
    if (!originals.length) return;
    const templates = originals.map((original) => original.cloneNode(true));
    originals.forEach((original) => original.remove());
    items.forEach((item) => {
      const source = templates[item.srcIndex] ?? templates[0];
      if (!source) return;
      const clone = source.cloneNode(true);
      const stamp = (element) => {
        const base = element.getAttribute("data-te-id");
        if (base) element.setAttribute("data-te-id", `${item.key}::${base}`);
        Array.from(element.children).forEach(stamp);
      };
      stamp(clone);
      clone.setAttribute("data-te-item", item.key);
      clone.setAttribute("data-te-repeater-id", repeaterId);
      container.appendChild(clone);
    });
  });
}

function setMeta(document, selector, attributes, content) {
  if (!content) return;
  const element = document.querySelector(selector) ?? document.head.appendChild(document.createElement("meta"));
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  element.setAttribute("content", String(content));
}

export function applySeo(document, seo, state, canonicalUrl) {
  if (seo.title) {
    const title = document.querySelector("title") ?? document.head.appendChild(document.createElement("title"));
    title.textContent = seo.title;
  }
  setMeta(document, 'meta[name="description"]', { name: "description" }, seo.description);
  setMeta(document, 'meta[name="keywords"]', { name: "keywords" }, seo.keywords);
  setMeta(document, 'meta[name="robots"]', { name: "robots" }, seo.robots);
  setMeta(document, 'meta[property="og:title"]', { property: "og:title" }, seo.ogTitle || seo.title);
  setMeta(document, 'meta[property="og:description"]', { property: "og:description" }, seo.ogDescription || seo.description);
  setMeta(document, 'meta[property="og:image"]', { property: "og:image" }, seo.ogImage);
  setMeta(document, 'meta[property="og:type"]', { property: "og:type" }, "website");
  setMeta(document, 'meta[name="twitter:card"]', { name: "twitter:card" }, seo.twitterCard || (seo.ogImage ? "summary_large_image" : "summary"));
  setMeta(document, 'meta[name="google-site-verification"]', { name: "google-site-verification" }, state.googleVerification || state.searchConsole);

  const canonical = seo.canonical || canonicalUrl;
  if (canonical) {
    const link = document.querySelector('link[rel="canonical"]') ?? document.head.appendChild(document.createElement("link"));
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", canonical);
    setMeta(document, 'meta[property="og:url"]', { property: "og:url" }, canonical);
  }
  if (seo.schema && typeof seo.schema === "string") {
    try {
      JSON.parse(seo.schema);
      const schema = document.head.appendChild(document.createElement("script"));
      schema.setAttribute("type", "application/ld+json");
      schema.textContent = seo.schema;
    } catch {
      // Invalid legacy schema is ignored instead of breaking the public page.
    }
  }
  if (state.googleAnalytics) {
    const measurementId = state.googleAnalytics;
    const loader = document.head.appendChild(document.createElement("script"));
    loader.setAttribute("async", "");
    loader.setAttribute("src", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
    const config = document.head.appendChild(document.createElement("script"));
    config.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(measurementId)});`;
  }
}

export function analyticsScript(websiteId) {
  return `<script>(function(){const key='webmintra_visitor_id';let visitorId=localStorage.getItem(key);if(!visitorId){visitorId=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);localStorage.setItem(key,visitorId);}const send=(type)=>{fetch('/api/public/site/${websiteId}/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,visitorId,path:location.pathname,referrer:document.referrer}),keepalive:true}).catch(()=>{});};send('page_view');document.addEventListener('submit',()=>send('conversion'),{once:false});})();</script>`;
}

export function formScript(websiteId) {
  return `<script>document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('form').forEach(form=>{const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.marginTop='0.75rem';form.appendChild(status);form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type="submit"]')||form.querySelector('button');const original=button?.textContent||'';status.textContent='';if(button){button.disabled=true;button.textContent='Submitting...';}try{const response=await fetch('/api/public/site/${websiteId}/form',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});if(!response.ok)throw new Error();form.reset();status.textContent='Thank you! Your submission has been received.';}catch{status.textContent='There was a problem submitting your form. Please try again.';}finally{if(button){button.disabled=false;button.textContent=original;}}});});});</script>`;
}

async function renderPage(req, res, next) {
  try {
    const website = await resolvePublishedWebsite(req.params.domainOrId);
    if (!website) return res.status(404).send("Website not found");
    const pages = buildPublicPages(website.templateId);
    if (!pages.length) return res.status(500).send("Template missing");
    const state = website.publishedState || {};
    const wildcardPath = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path;
    const requestedPath = normalizePublicPath(wildcardPath || "/");
    const redirect = findRedirect(state.redirects, requestedPath);
    if (redirect) return res.redirect(301, redirect.to);

    let page = findPublicPage(pages, requestedPath);
    let status = 200;
    if (!page) {
      page = findPageById(pages, state.custom404?.pageId);
      if (!page) return res.status(404).send("Page not found");
      status = 404;
    }

    const owner = await User.findById(website.owner).select("business").lean();
    const baseUrl = publicBaseUrl(req);
    const canonicalUrl = `${baseUrl}${page.route === "/" ? "" : page.route}`;
    const plugins = await WebsitePlugin.find({ website: website._id, isEnabled: true }).lean();

    const html = renderPublishedPage({
      page,
      state,
      canonicalUrl,
      websiteId: website._id,
      fallbackFaviconUrl: owner?.business?.faviconUrl,
      plugins,
    });
    return res.status(status).type("html").send(html);
  } catch (error) {
    return next(error);
  }
}

export function renderPublishedPage({ page, state = {}, canonicalUrl, websiteId, fallbackFaviconUrl, plugins = [] }) {
  const dom = new JSDOM(page.htmlContent);
  const document = dom.window.document;
  const edits = pageStateValue(state.edits, page);
  applyRepeaters(document, state.repeaters);
  Object.entries(edits).forEach(([id, edit]) => {
    Array.from(document.querySelectorAll(`[data-te-id="${id}"]`)).forEach((element) => applyEdit(element, edit));
  });

  const faviconUrl = state.globalSeo?.favicon || fallbackFaviconUrl;
  if (faviconUrl) {
    const favicon = document.querySelector('link[rel~="icon"]') ?? document.head.appendChild(document.createElement("link"));
    favicon.setAttribute("rel", "icon");
    favicon.setAttribute("href", faviconUrl);
  }
  applySeo(document, mergedPageSeo(state, page), state, canonicalUrl);

  const { headHtml, bodyHtml } = generatePluginInjections(plugins);

  let html = `<!DOCTYPE html>${document.documentElement.outerHTML}`;
  if (!html.includes("tailwindcss")) html = html.replace("</head>", '<script src="https://cdn.tailwindcss.com"></script></head>');
  html = html.replace("</head>", `<style id="te-theme">${themeCss(state.theme || {})}</style>${headHtml}</head>`);
  html = html.replace("</body>", `${analyticsScript(websiteId)}${formScript(websiteId)}${bodyHtml}</body>`);
  return html;
}

router.get("/site/:domainOrId/sitemap.xml", async (req, res, next) => {
  try {
    const website = await resolvePublishedWebsite(req.params.domainOrId);
    if (!website) return res.status(404).send("Website not found");
    const xml = buildSitemapXml(buildPublicPages(website.templateId), website.publishedState || {}, publicBaseUrl(req));
    return res.type("application/xml").send(xml);
  } catch (error) {
    return next(error);
  }
});

router.get("/site/:domainOrId/robots.txt", async (req, res, next) => {
  try {
    const website = await resolvePublishedWebsite(req.params.domainOrId);
    if (!website) return res.status(404).send("Website not found");
    return res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${publicBaseUrl(req)}/sitemap.xml\n`);
  } catch (error) {
    return next(error);
  }
});

router.post("/site/:domainOrId/analytics", async (req, res, next) => {
  try {
    const website = await resolvePublishedWebsite(req.params.domainOrId);
    if (!website) return res.status(404).json({ message: "Website not found." });
    const { type, visitorId, path, referrer } = req.body ?? {};
    if (!ANALYTICS_EVENT_TYPES.includes(type) || typeof visitorId !== "string" || visitorId.length < 8 || visitorId.length > 100) {
      return res.status(400).json({ message: "Analytics event is invalid." });
    }
    const referrerHost = typeof referrer === "string" && referrer
      ? (() => { try { return new URL(referrer).hostname; } catch { return ""; } })()
      : "";
    await AnalyticsEvent.create({
      website: website._id,
      tenant: website.owner,
      type,
      visitorId,
      path: typeof path === "string" ? path.slice(0, 500) : "/",
      referrerHost,
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post("/site/:domainOrId/form", async (req, res, next) => {
  try {
    const website = await resolvePublishedWebsite(req.params.domainOrId);
    if (!website) return res.status(404).json({ message: "Website not found." });
    const cleanData = sanitizeFormData(req.body);
    const submission = await FormSubmission.create({ websiteId: website._id, tenantId: website.owner, data: cleanData });
    return res.status(201).json({ message: "Form submitted successfully", id: submission._id });
  } catch (error) {
    return next(error);
  }
});

router.get("/site/:domainOrId", renderPage);
router.get("/site/:domainOrId/*path", renderPage);

export default router;
