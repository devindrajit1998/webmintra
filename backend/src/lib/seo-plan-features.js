import mongoose from "mongoose";

export const SEO_PLAN_FEATURE_KEYS = Object.freeze([
    "pageTitle",
    "metaDescription",
    "searchKeywords",
    "canonicalUrl",
    "socialTitle",
    "socialDescription",
    "socialImage",
    "twitterCard",
    "robotsDirective",
    "xmlSitemap",
    "sitemapCustomization",
    "schemaJsonLd",
    "structuredDataPresets",
    "openGraph",
    "googleVerification",
    "searchConsoleIntegration",
    "googleAnalytics",
    "redirects301",
    "custom404",
    "seoHealthScore",
    "seoRecommendations",
    "imageAltText",
    "indexNoIndexPerPage",
    "seoSettingsPerPage",
    "globalSeoSettings",
]);

export const SEO_PLAN_FEATURE_DEFINITIONS = Object.freeze({
    pageTitle: { label: "Page title", kind: "boolean", default: true },
    metaDescription: { label: "Meta description", kind: "boolean", default: true },
    searchKeywords: { label: "Search keywords", kind: "boolean", default: true },
    canonicalUrl: { label: "Canonical URL", kind: "boolean", default: false },
    socialTitle: { label: "Social title", kind: "boolean", default: false },
    socialDescription: { label: "Social description", kind: "boolean", default: false },
    socialImage: { label: "Social image", kind: "boolean", default: false },
    twitterCard: { label: "Twitter/X card", kind: "boolean", default: false },
    robotsDirective: { label: "Robots directive", kind: "level", values: ["basic", "custom", "advanced"], default: "basic" },
    xmlSitemap: { label: "XML Sitemap", kind: "boolean", default: true },
    sitemapCustomization: { label: "Sitemap customization", kind: "boolean", default: false },
    schemaJsonLd: { label: "Schema / JSON-LD", kind: "level", values: ["disabled", "basic_presets", "custom_json_ld"], default: "disabled" },
    structuredDataPresets: { label: "Structured data presets", kind: "boolean", default: false },
    openGraph: { label: "Open Graph", kind: "boolean", default: false },
    googleVerification: { label: "Google verification", kind: "boolean", default: false },
    searchConsoleIntegration: { label: "Search Console integration", kind: "boolean", default: false },
    googleAnalytics: { label: "Google Analytics", kind: "boolean", default: false },
    redirects301: { label: "301 redirects", kind: "boolean", default: false },
    custom404: { label: "404 page customization", kind: "boolean", default: false },
    seoHealthScore: { label: "SEO health score", kind: "level", values: ["basic", "advanced"], default: "basic" },
    seoRecommendations: { label: "SEO recommendations", kind: "level", values: ["disabled", "enabled", "ai_advanced"], default: "disabled" },
    imageAltText: { label: "Image alt-text controls", kind: "level", values: ["basic", "enabled"], default: "basic" },
    indexNoIndexPerPage: { label: "Index/no-index per page", kind: "boolean", default: false },
    seoSettingsPerPage: { label: "SEO settings per page", kind: "level", values: ["limited", "enabled"], default: "limited" },
    globalSeoSettings: { label: "Global SEO settings", kind: "boolean", default: true },
});

const seoFeatureSchema = new mongoose.Schema(
    Object.fromEntries(
        SEO_PLAN_FEATURE_KEYS.map((key) => {
            const definition = SEO_PLAN_FEATURE_DEFINITIONS[key];
            return [
                key,
                definition.kind === "boolean"
                    ? { type: Boolean }
                    : { type: String, enum: definition.values },
            ];
        }),
    ),
    { _id: false, strict: "throw" },
);

export const SEO_PLAN_DEFAULTS = Object.freeze({
    starter: Object.fromEntries(SEO_PLAN_FEATURE_KEYS.map((key) => [key, SEO_PLAN_FEATURE_DEFINITIONS[key].default])),
    growth: {
        ...Object.fromEntries(SEO_PLAN_FEATURE_KEYS.map((key) => [key, SEO_PLAN_FEATURE_DEFINITIONS[key].default])),
        canonicalUrl: true, socialTitle: true, socialDescription: true, socialImage: true, twitterCard: true,
        robotsDirective: "custom", schemaJsonLd: "basic_presets", structuredDataPresets: true, openGraph: true,
        googleVerification: true, googleAnalytics: true, redirects301: true, seoHealthScore: "advanced",
        seoRecommendations: "enabled", imageAltText: "enabled", indexNoIndexPerPage: true, seoSettingsPerPage: "enabled",
    },
    pro: {
        ...Object.fromEntries(SEO_PLAN_FEATURE_KEYS.map((key) => [key, SEO_PLAN_FEATURE_DEFINITIONS[key].default])),
        canonicalUrl: true, socialTitle: true, socialDescription: true, socialImage: true, twitterCard: true,
        robotsDirective: "advanced", sitemapCustomization: true, schemaJsonLd: "custom_json_ld", structuredDataPresets: true,
        openGraph: true, googleVerification: true, searchConsoleIntegration: true, googleAnalytics: true, redirects301: true,
        custom404: true, seoHealthScore: "advanced", seoRecommendations: "ai_advanced", imageAltText: "enabled",
        indexNoIndexPerPage: true, seoSettingsPerPage: "enabled",
    },
});

export function normalizeSeoPlanFeatures(input, fallback = {}) {
    const source = input && typeof input === "object" ? input : {};
    const result = { ...fallback };
    for (const key of Object.keys(source)) {
        const definition = SEO_PLAN_FEATURE_DEFINITIONS[key];
        if (!definition) throw new Error(`Unsupported SEO plan feature: ${key}.`);
        const value = source[key];
        if (definition.kind === "boolean") {
            if (typeof value !== "boolean") throw new Error(`SEO plan feature ${key} must be boolean.`);
        } else if (!definition.values.includes(value)) {
            throw new Error(`Invalid value for SEO plan feature ${key}.`);
        }
        result[key] = value;
    }
    return result;
}

export function effectiveSeoPlanFeatures(planSlug, configured) {
    const fallback = SEO_PLAN_DEFAULTS[planSlug] || SEO_PLAN_DEFAULTS.starter;
    return normalizeSeoPlanFeatures(configured, fallback);
}

export { seoFeatureSchema };
