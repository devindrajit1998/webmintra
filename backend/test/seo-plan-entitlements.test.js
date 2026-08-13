import test from "node:test";
import assert from "node:assert/strict";
import {
    SEO_PLAN_DEFAULTS,
    SEO_PLAN_FEATURE_KEYS,
    effectiveSeoPlanFeatures,
    normalizeSeoPlanFeatures,
} from "../src/lib/seo-plan-features.js";
import {
    displayPlanName,
    sanitizeDraftSeo,
} from "../src/lib/tenant-seo-entitlements.js";
import {
    buildPublicPages,
    buildSitemapXml,
    findPageById,
    findPublicPage,
    findRedirect,
    mergedPageSeo,
    pageStateValue,
    xmlEscape,
} from "../src/lib/public-site.js";
import { missingSeoPlanFeatures } from "../src/scripts/seedSeoPlanEntitlements.js";
import { publicBaseUrl, renderPublishedPage } from "../src/routes/public.js";

test("canonical SEO plans expose all stable entitlement keys", () => {
    for (const slug of ["starter", "growth", "pro"]) {
        assert.deepEqual(Object.keys(SEO_PLAN_DEFAULTS[slug]).sort(), [...SEO_PLAN_FEATURE_KEYS].sort());
    }
    assert.equal(SEO_PLAN_DEFAULTS.starter.canonicalUrl, false);
    assert.equal(SEO_PLAN_DEFAULTS.growth.schemaJsonLd, "basic_presets");
    assert.equal(SEO_PLAN_DEFAULTS.pro.schemaJsonLd, "custom_json_ld");
    assert.equal(SEO_PLAN_DEFAULTS.pro.seoRecommendations, "ai_advanced");
});

test("SEO plan normalization rejects unknown keys and invalid levels", () => {
    assert.throws(() => normalizeSeoPlanFeatures({ unknownCapability: true }), /Unsupported SEO plan feature/);
    assert.throws(() => normalizeSeoPlanFeatures({ robotsDirective: "unrestricted" }), /Invalid value/);
    assert.throws(() => normalizeSeoPlanFeatures({ canonicalUrl: "yes" }), /must be boolean/);
});

test("effective SEO entitlements inherit defaults without replacing explicit overrides", () => {
    const result = effectiveSeoPlanFeatures("growth", {
        canonicalUrl: false,
        seoRecommendations: "ai_advanced",
    });
    assert.equal(result.canonicalUrl, false);
    assert.equal(result.socialImage, true);
    assert.equal(result.seoRecommendations, "ai_advanced");
});

test("draft SEO sanitization removes fields unavailable to Starter", () => {
    const result = sanitizeDraftSeo({
        seo: {
            home: {
                title: "Home",
                description: "Description",
                canonical: "https://example.com",
                ogImage: "https://example.com/image.jpg",
                robots: "noindex, nofollow",
                schema: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization" }),
            },
            about: { title: "About" },
        },
        redirects: [{ from: "/old", to: "/new" }],
        custom404: { pageId: "missing" },
    }, SEO_PLAN_DEFAULTS.starter);

    assert.equal(result.seo.home.title, "Home");
    assert.equal(result.seo.home.description, "Description");
    assert.equal(result.seo.home.robots, "index, follow");
    assert.equal(result.seo.home.canonical, undefined);
    assert.equal(result.seo.home.ogImage, undefined);
    assert.equal(result.seo.home.schema, undefined);
    assert.equal(result.seo.about, undefined);
    assert.equal(result.redirects, undefined);
    assert.equal(result.custom404, undefined);
});

test("Growth accepts allowlisted schema presets but removes arbitrary JSON-LD", () => {
    const preset = JSON.stringify({ "@context": "https://schema.org", "@type": "LocalBusiness" });
    const custom = JSON.stringify({ "@context": "https://schema.org", "@type": "Product" });
    const allowed = sanitizeDraftSeo({ seo: { home: { schema: preset } } }, SEO_PLAN_DEFAULTS.growth);
    const removed = sanitizeDraftSeo({ seo: { home: { schema: custom } } }, SEO_PLAN_DEFAULTS.growth);
    assert.equal(allowed.seo.home.schema, preset);
    assert.equal(removed.seo.home.schema, undefined);
});

test("Business runtime settings are normalized and invalid values are removed", () => {
    const result = sanitizeDraftSeo({
        globalSeo: { title: " Global title ", robots: "NOINDEX, follow, invalid" },
        sitemap: {
            excludedPageIds: ["page-2", "page-2", "bad id"],
            priorities: { "page-0": 0.8, "page-1": 2 },
            changefreq: { "page-0": "Weekly", "page-1": "sometimes" },
        },
        googleVerification: "google-token_123",
        searchConsole: "search-console_456",
        googleAnalytics: "g-abcd1234",
        redirects: [
            { from: "/Old/", to: "/new" },
            { from: "/old", to: "/duplicate" },
            { from: "invalid", to: "/new" },
            { from: "/unsafe", to: "javascript:alert(1)" },
        ],
        custom404: { pageId: "page-3" },
        edits: { "page-0": { image: { alt: " Product image ", src: "/image.jpg" } } },
    }, SEO_PLAN_DEFAULTS.pro);

    assert.equal(result.globalSeo.title, "Global title");
    assert.equal(result.globalSeo.robots, "noindex, follow");
    assert.deepEqual(result.sitemap.excludedPageIds, ["page-2"]);
    assert.deepEqual(result.sitemap.priorities, { "page-0": 0.8 });
    assert.deepEqual(result.sitemap.changefreq, { "page-0": "weekly" });
    assert.equal(result.googleAnalytics, "G-ABCD1234");
    assert.deepEqual(result.redirects, [{ from: "/Old", to: "/new" }]);
    assert.deepEqual(result.custom404, { pageId: "page-3" });
    assert.equal(result.edits["page-0"].image.alt, "Product image");
});

test("Growth strips Business runtime settings and preserves entitled alt text", () => {
    const result = sanitizeDraftSeo({
        sitemap: { excludedPageIds: ["page-1"] },
        searchConsole: "search-console_456",
        custom404: { pageId: "page-2" },
        edits: { "page-0": { image: { alt: "Hero", src: "/hero.jpg" } } },
    }, SEO_PLAN_DEFAULTS.growth);
    assert.equal(result.sitemap, undefined);
    assert.equal(result.searchConsole, undefined);
    assert.equal(result.custom404, undefined);
    assert.equal(result.edits["page-0"].image.alt, "Hero");
});

test("Starter strips custom image alt edits", () => {
    const result = sanitizeDraftSeo({ edits: { "page-0": { image: { alt: "Hero", src: "/hero.jpg" } } } }, SEO_PLAN_DEFAULTS.starter);
    assert.equal(result.edits["page-0"].image.alt, undefined);
    assert.equal(result.edits["page-0"].image.src, "/hero.jpg");
});

test("public page helpers provide stable routes and legacy state fallback", () => {
    const pages = buildPublicPages({
        htmlContent: "<html><head></head><body>Home</body></html>",
        pages: [
            { name: "About Us.html", htmlContent: "<html><body>About</body></html>" },
            { name: "legal/privacy.html", htmlContent: "<html><body>Privacy</body></html>" },
        ],
    });
    assert.deepEqual(pages.map(({ id, route }) => ({ id, route })), [
        { id: "page-0", route: "/" },
        { id: "page-1", route: "/about-us" },
        { id: "page-2", route: "/legal/privacy" },
    ]);
    assert.equal(findPublicPage(pages, "/ABOUT-US/").id, "page-1");
    assert.equal(findPageById(pages, "index").id, "page-0");
    assert.deepEqual(pageStateValue({ index: { title: "Legacy" } }, pages[0]), { title: "Legacy" });
    assert.deepEqual(mergedPageSeo({ globalSeo: { title: "Global", description: "Default" }, seo: { "page-1": { title: "About" } } }, pages[1]), { title: "About", description: "Default" });
});

test("public helpers resolve redirects and omit excluded or noindex pages from sitemap", () => {
    const pages = buildPublicPages({
        htmlContent: "<html></html>",
        pages: [
            { name: "about.html", htmlContent: "<html></html>" },
            { name: "private.html", htmlContent: "<html></html>" },
        ],
    });
    const state = {
        seo: { "page-2": { robots: "noindex, follow" } },
        sitemap: { excludedPageIds: ["page-1"], priorities: { "page-0": 1 }, changefreq: { "page-0": "weekly" } },
    };
    assert.deepEqual(findRedirect([{ from: "/old", to: "/new" }], "/OLD/"), { from: "/old", to: "/new" });
    const xml = buildSitemapXml(pages, state, "https://example.com/site");
    assert.match(xml, /https:\/\/example\.com\/site/);
    assert.match(xml, /<changefreq>weekly<\/changefreq>/);
    assert.match(xml, /<priority>1\.0<\/priority>/);
    assert.doesNotMatch(xml, /about/);
    assert.doesNotMatch(xml, /private/);
    assert.equal(xmlEscape("Tom's & Co"), `Tom&${"#39;"}s &${"#38;"} Co`);
});

test("published HTML applies page overrides, integrations, and entitled image alt text", () => {
    const [page] = buildPublicPages({
        htmlContent: '<html><head><title>Original</title></head><body><img data-te-id="hero" src="/hero.jpg"><form><button>Send</button></form></body></html>',
    });
    const html = renderPublishedPage({
        page,
        canonicalUrl: "https://example.com",
        websiteId: "507f1f77bcf86cd799439011",
        fallbackFaviconUrl: "/fallback.ico",
        state: {
            globalSeo: { title: "Global title", description: "Global description", favicon: "/brand.ico" },
            seo: { "page-0": { title: "Page title", ogTitle: "Shared page" } },
            googleVerification: "verification_token",
            googleAnalytics: "G-ABCD1234",
            edits: { "page-0": { hero: { alt: "Product hero" } } },
        },
    });

    assert.match(html, /<title>Page title<\/title>/);
    assert.match(html, /name="description" content="Global description"/);
    assert.match(html, /property="og:title" content="Shared page"/);
    assert.match(html, /rel="canonical" href="https:\/\/example\.com"/);
    assert.match(html, /google-site-verification" content="verification_token"/);
    assert.match(html, /googletagmanager\.com\/gtag\/js\?id=G-ABCD1234/);
    assert.match(html, /data-te-id="hero" src="\/hero\.jpg" alt="Product hero"/);
    assert.match(html, /rel="icon" href="\/brand\.ico"/);
    assert.match(html, /\/api\/public\/site\/507f1f77bcf86cd799439011\/form/);
    assert.match(html, /\/api\/public\/site\/507f1f77bcf86cd799439011\/analytics/);
});

test("public base URL uses custom-domain origins and API paths for website IDs", () => {
    const request = (domainOrId, headers = {}) => ({
        params: { domainOrId },
        headers,
        protocol: "http",
        get: () => "api.webmintra.test",
    });
    assert.equal(
        publicBaseUrl(request("www.example.com", { "x-forwarded-proto": "https", "x-forwarded-host": "www.example.com" })),
        "https://www.example.com",
    );
    assert.equal(
        publicBaseUrl(request("507f1f77bcf86cd799439011")),
        "http://api.webmintra.test/api/public/site/507f1f77bcf86cd799439011",
    );
});

test("SEO defaults migration fills only missing keys", () => {
    const missing = missingSeoPlanFeatures({ slug: "growth", seoFeatures: { canonicalUrl: false } });
    assert.equal(missing.canonicalUrl, undefined);
    assert.equal(missing.socialTitle, true);
    assert.equal(Object.keys(missing).length, SEO_PLAN_FEATURE_KEYS.length - 1);
    assert.deepEqual(missingSeoPlanFeatures({ slug: "custom", seoFeatures: {} }), {});
});

test("internal pro plan is displayed as Business", () => {
    assert.equal(displayPlanName("pro"), "Business");
    assert.equal(displayPlanName("Pro"), "Business");
    assert.equal(displayPlanName("Growth"), "Growth");
});
