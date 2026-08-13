const PAGE_ID_PATTERN = /^page-(\d+)$/;

export function normalizePublicPath(value) {
    const raw = typeof value === "string" ? value : "/";
    let decoded;
    try {
        decoded = decodeURIComponent(raw.split(/[?#]/, 1)[0]);
    } catch {
        decoded = raw.split(/[?#]/, 1)[0];
    }
    const normalized = `/${decoded}`.replace(/\/{2,}/g, "/").replace(/\/$/, "");
    return normalized === "" || normalized === "/index.html" ? "/" : normalized.toLowerCase();
}

export function routeFromPageName(name, index) {
    if (index === 0) return "/";
    const cleaned = String(name || `page-${index}`)
        .trim()
        .replace(/\\/g, "/")
        .split("/")
        .filter((part) => part && part !== "." && part !== "..")
        .join("/")
        .replace(/\.html?$/i, "")
        .replace(/[^a-zA-Z0-9/_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-/]+|[-/]+$/g, "")
        .toLowerCase();
    return cleaned ? `/${cleaned}` : `/page-${index}`;
}

export function buildPublicPages(template) {
    const sources = [];
    if (template?.htmlContent) sources.push({ name: "index.html", htmlContent: template.htmlContent });
    if (Array.isArray(template?.pages)) {
        for (const page of template.pages) {
            if (page?.htmlContent) sources.push({ name: page.name, htmlContent: page.htmlContent });
        }
    }

    const routes = new Set();
    return sources.map((page, index) => {
        let route = routeFromPageName(page.name, index);
        if (routes.has(route)) route = `${route}-${index}`;
        routes.add(route);
        return {
            id: `page-${index}`,
            index,
            name: page.name || `page-${index}.html`,
            route,
            htmlContent: page.htmlContent,
            isHome: index === 0,
        };
    });
}

function legacyKeys(page) {
    const keys = [page.id];
    if (page.index === 0) keys.push("index", "page1", "home");
    else keys.push(`page${page.index + 1}`);
    return keys;
}

export function pageStateValue(collection, page) {
    if (!collection || typeof collection !== "object" || Array.isArray(collection)) return {};
    for (const key of legacyKeys(page)) {
        const value = collection[key];
        if (value && typeof value === "object" && !Array.isArray(value)) return value;
    }
    const usesStablePageIds = Object.keys(collection).some((key) => PAGE_ID_PATTERN.test(key));
    if (page.index === 0 && !usesStablePageIds) {
        const first = Object.values(collection).find((value) => value && typeof value === "object" && !Array.isArray(value));
        return first || {};
    }
    return {};
}

export function findPublicPage(pages, requestedPath) {
    const path = normalizePublicPath(requestedPath);
    return pages.find((page) => page.route === path);
}

export function findPageById(pages, pageId) {
    if (typeof pageId !== "string") return undefined;
    const direct = pages.find((page) => page.id === pageId);
    if (direct) return direct;
    if (pageId === "index" || pageId === "page1" || pageId === "home") return pages[0];
    const match = PAGE_ID_PATTERN.exec(pageId);
    return match ? pages[Number(match[1])] : undefined;
}

export function mergedPageSeo(state, page) {
    const globalSeo = state?.globalSeo && typeof state.globalSeo === "object" && !Array.isArray(state.globalSeo)
        ? state.globalSeo
        : {};
    return { ...globalSeo, ...pageStateValue(state?.seo, page) };
}

export function findRedirect(redirects, requestedPath) {
    if (!Array.isArray(redirects)) return undefined;
    const path = normalizePublicPath(requestedPath);
    return redirects.find((redirect) => normalizePublicPath(redirect?.from) === path);
}

export function sitemapPages(pages, state) {
    const excluded = new Set(state?.sitemap?.excludedPageIds || []);
    return pages.filter((page) => {
        if (excluded.has(page.id)) return false;
        const robots = String(mergedPageSeo(state, page).robots || "").toLowerCase();
        return !robots.split(",").map((value) => value.trim()).includes("noindex");
    });
}

export function xmlEscape(value) {
    const entity = (code) => `${String.fromCharCode(38)}#${code};`;
    const entities = { "&": entity(38), "<": entity(60), ">": entity(62), "\"": entity(34), [String.fromCharCode(39)]: entity(39) };
    return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

export function buildSitemapXml(pages, state, baseUrl) {
    const base = String(baseUrl).replace(/\/$/, "");
    const entries = sitemapPages(pages, state).map((page) => {
        const location = `${base}${page.route === "/" ? "" : page.route}`;
        const priority = state?.sitemap?.priorities?.[page.id];
        const changefreq = state?.sitemap?.changefreq?.[page.id];
        return [
            "  <url>",
            `    <loc>${xmlEscape(location || base)}</loc>`,
            changefreq ? `    <changefreq>${xmlEscape(changefreq)}</changefreq>` : "",
            priority !== undefined ? `    <priority>${Number(priority).toFixed(1)}</priority>` : "",
            "  </url>",
        ].filter(Boolean).join("\n");
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;
}
