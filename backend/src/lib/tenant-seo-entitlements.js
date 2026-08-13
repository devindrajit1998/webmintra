import { Plan } from "../models/Plan.js";
import { Subscription } from "../models/Subscription.js";
import { effectiveSeoPlanFeatures } from "./seo-plan-features.js";

const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "paused"];

export function displayPlanName(value) {
    return String(value || "starter").toLowerCase() === "pro" ? "Business" : String(value || "Starter");
}

export async function resolveTenantSeoEntitlements(user) {
    const subscription = await Subscription.findOne({
        tenant: user._id,
        status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
    })
        .sort({ createdAt: -1 })
        .populate("plan", "slug name seoFeatures features limits")
        .lean();

    let plan = subscription?.plan && typeof subscription.plan === "object" ? subscription.plan : null;
    if (!plan) plan = await Plan.findOne({ slug: user.plan || "starter", status: "active" }).select("slug name seoFeatures features limits").lean();

    const planSlug = plan?.slug || user.plan || "starter";
    return {
        planSlug,
        planName: displayPlanName(planSlug === "pro" ? "pro" : plan?.name || planSlug),
        limits: plan?.limits || subscription?.limits || {},
        seoFeatures: effectiveSeoPlanFeatures(planSlug, plan?.seoFeatures),
    };
}

const SEO_FIELD_FEATURES = Object.freeze({
    title: "pageTitle",
    description: "metaDescription",
    keywords: "searchKeywords",
    canonical: "canonicalUrl",
    ogTitle: "socialTitle",
    ogDescription: "socialDescription",
    ogImage: "socialImage",
    twitterCard: "twitterCard",
});

const SEO_FIELD_LIMITS = Object.freeze({
    title: 200,
    description: 500,
    keywords: 500,
    canonical: 2048,
    ogTitle: 200,
    ogDescription: 500,
    ogImage: 2048,
    twitterCard: 40,
    robots: 200,
    favicon: 2048,
    schema: 50000,
});
const ROBOTS_DIRECTIVES = new Set([
    "index", "noindex", "follow", "nofollow", "noarchive", "nosnippet",
    "noimageindex", "notranslate", "max-snippet:-1", "max-image-preview:large",
]);
const SITEMAP_CHANGE_FREQUENCIES = new Set(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]);
const PAGE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/;
const GOOGLE_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{6,200}$/;
const ANALYTICS_ID_PATTERN = /^(?:G-[A-Z0-9]{4,20}|GT-[A-Z0-9]{4,20}|GTM-[A-Z0-9]{4,20}|UA-\d{4,15}-\d{1,4})$/i;

function enabled(value) {
    return value === true || value === "enabled" || value === "basic" || value === "custom" || value === "advanced" || value === "basic_presets" || value === "custom_json_ld" || value === "ai_advanced" || value === "limited";
}

function cleanString(value, maxLength) {
    if (typeof value !== "string") return undefined;
    const cleaned = value.trim();
    return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function cleanPageId(value) {
    const cleaned = cleanString(value, 128);
    return cleaned && PAGE_ID_PATTERN.test(cleaned) ? cleaned : undefined;
}

function normalizePath(value) {
    const cleaned = cleanString(value, 2048);
    if (!cleaned || !cleaned.startsWith("/") || cleaned.startsWith("//")) return undefined;
    const path = cleaned.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return path.startsWith("/api/public/site/") ? undefined : path;
}

function normalizeRedirectTarget(value) {
    const cleaned = cleanString(value, 2048);
    if (!cleaned) return undefined;
    if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return cleaned;
    try {
        const url = new URL(cleaned);
        return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
    } catch {
        return undefined;
    }
}

const BASIC_SCHEMA_TYPES = new Set(["LocalBusiness", "Organization", "WebSite"]);

function isBasicSchemaPreset(value) {
    if (typeof value !== "string") return false;
    try {
        const parsed = JSON.parse(value);
        return parsed?.["@context"] === "https://schema.org" && BASIC_SCHEMA_TYPES.has(parsed?.["@type"]);
    } catch {
        return false;
    }
}

function sanitizePageSeo(input, entitlements) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    const output = {};
    for (const [field, maxLength] of Object.entries(SEO_FIELD_LIMITS)) {
        const value = cleanString(input[field], maxLength);
        if (value !== undefined) output[field] = value;
    }
    for (const [field, feature] of Object.entries(SEO_FIELD_FEATURES)) {
        if (!enabled(entitlements[feature])) delete output[field];
    }

    if (entitlements.robotsDirective === "basic") {
        output.robots = "index, follow";
    } else if (enabled(entitlements.robotsDirective)) {
        const directives = String(output.robots || "index, follow")
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter((value) => ROBOTS_DIRECTIVES.has(value));
        output.robots = [...new Set(directives)].join(", ") || "index, follow";
    } else {
        delete output.robots;
    }

    if (entitlements.schemaJsonLd === "disabled") {
        delete output.schema;
    } else if (entitlements.schemaJsonLd === "basic_presets") {
        if (!isBasicSchemaPreset(output.schema)) delete output.schema;
    } else if (typeof output.schema === "string") {
        try {
            JSON.parse(output.schema);
        } catch {
            delete output.schema;
        }
    }

    return output;
}

function sanitizeSitemap(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    const excludedPageIds = Array.isArray(input.excludedPageIds)
        ? [...new Set(input.excludedPageIds.map(cleanPageId).filter(Boolean))].slice(0, 500)
        : [];
    const priorities = Object.fromEntries(Object.entries(input.priorities || {}).flatMap(([pageId, value]) => {
        const id = cleanPageId(pageId);
        const priority = Number(value);
        return id && Number.isFinite(priority) && priority >= 0 && priority <= 1 ? [[id, priority]] : [];
    }));
    const changefreq = Object.fromEntries(Object.entries(input.changefreq || {}).flatMap(([pageId, value]) => {
        const id = cleanPageId(pageId);
        const frequency = cleanString(value, 20)?.toLowerCase();
        return id && SITEMAP_CHANGE_FREQUENCIES.has(frequency) ? [[id, frequency]] : [];
    }));
    return { excludedPageIds, priorities, changefreq };
}

function sanitizeRedirects(input) {
    if (!Array.isArray(input)) return [];
    const seen = new Set();
    return input.flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
        const from = normalizePath(entry.from);
        const to = normalizeRedirectTarget(entry.to);
        const normalizedFrom = from?.toLowerCase();
        const normalizedRelativeTarget = to?.startsWith("/") ? normalizePath(to)?.toLowerCase() : undefined;
        if (!from || !to || normalizedFrom === normalizedRelativeTarget || seen.has(normalizedFrom)) return [];
        seen.add(normalizedFrom);
        return [{ from, to }];
    }).slice(0, 100);
}

function sanitizeEdits(input, entitlements) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    return Object.fromEntries(Object.entries(input).map(([pageId, pageEdits]) => {
        if (!pageEdits || typeof pageEdits !== "object" || Array.isArray(pageEdits)) return [pageId, {}];
        return [pageId, Object.fromEntries(Object.entries(pageEdits).map(([elementId, edit]) => {
            if (!edit || typeof edit !== "object" || Array.isArray(edit)) return [elementId, {}];
            const sanitized = { ...edit };
            if (entitlements.imageAltText !== "enabled") delete sanitized.alt;
            else if (sanitized.alt !== undefined) sanitized.alt = String(sanitized.alt).trim().slice(0, 500);
            return [elementId, sanitized];
        }))];
    }));
}

export function sanitizeDraftSeo(draftState, entitlements) {
    if (!draftState || typeof draftState !== "object" || Array.isArray(draftState)) return draftState;
    const output = { ...draftState };
    const seo = draftState.seo && typeof draftState.seo === "object" && !Array.isArray(draftState.seo) ? draftState.seo : {};
    const pageEntries = Object.entries(seo).filter(([pageId]) => cleanPageId(pageId));
    const allowedEntries = entitlements.seoSettingsPerPage === "enabled" ? pageEntries : pageEntries.slice(0, 1);
    output.seo = Object.fromEntries(allowedEntries.map(([pageId, value]) => [pageId, sanitizePageSeo(value, entitlements)]));
    output.edits = sanitizeEdits(draftState.edits, entitlements);

    if (enabled(entitlements.globalSeoSettings)) output.globalSeo = sanitizePageSeo(draftState.globalSeo, entitlements);
    else delete output.globalSeo;
    if (enabled(entitlements.sitemapCustomization)) output.sitemap = sanitizeSitemap(draftState.sitemap);
    else delete output.sitemap;

    const googleVerification = cleanString(draftState.googleVerification, 200);
    if (enabled(entitlements.googleVerification) && googleVerification && GOOGLE_TOKEN_PATTERN.test(googleVerification)) output.googleVerification = googleVerification;
    else delete output.googleVerification;
    const searchConsole = cleanString(draftState.searchConsole, 200);
    if (enabled(entitlements.searchConsoleIntegration) && searchConsole && GOOGLE_TOKEN_PATTERN.test(searchConsole)) output.searchConsole = searchConsole;
    else delete output.searchConsole;
    const googleAnalytics = cleanString(draftState.googleAnalytics, 40)?.toUpperCase();
    if (enabled(entitlements.googleAnalytics) && googleAnalytics && ANALYTICS_ID_PATTERN.test(googleAnalytics)) output.googleAnalytics = googleAnalytics;
    else delete output.googleAnalytics;
    if (enabled(entitlements.redirects301)) output.redirects = sanitizeRedirects(draftState.redirects);
    else delete output.redirects;

    const custom404PageId = cleanPageId(draftState.custom404?.pageId);
    if (enabled(entitlements.custom404) && custom404PageId) output.custom404 = { pageId: custom404PageId };
    else delete output.custom404;
    return output;
}
