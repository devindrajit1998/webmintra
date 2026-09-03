const SEO_RULES = Object.freeze({
    "seo.defaultTitle": { type: "string", maxLength: 70, required: true },
    "seo.defaultDescription": { type: "string", maxLength: 180, required: true },
    "seo.keywords": { type: "string", maxLength: 300 },
    "seo.canonicalUrl": { type: "url", maxLength: 500 },
    "seo.socialImageUrl": { type: "url", maxLength: 1000 },
    "seo.twitterHandle": { type: "twitter", maxLength: 16 },
    "seo.locale": { type: "locale", maxLength: 10 },
    "seo.organizationName": { type: "string", maxLength: 120, required: true },
    "seo.organizationLogoUrl": { type: "url", maxLength: 1000 },
    "seo.allowIndexing": { type: "boolean" },
    "seo.googleSiteVerification": { type: "string", maxLength: 200 },
    "seo.bingVerification": { type: "string", maxLength: 200 },
});

export const SEO_SETTING_KEYS = Object.freeze(Object.keys(SEO_RULES));

function normalizeUrl(value, key) {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";

    let url;
    try {
        url = new URL(normalized);
    } catch {
        throw new Error(`${key} must be a valid absolute URL.`);
    }

    if (!new Set(["http:", "https:"]).has(url.protocol)) {
        throw new Error(`${key} must use http or https.`);
    }

    return url.toString();
}

export function normalizeSeoSetting(key, value) {
    const rule = SEO_RULES[key];
    if (!rule) throw new Error(`Unsupported SEO setting: ${key}.`);

    if (rule.type === "boolean") {
        if (value === true || value === "true") return true;
        if (value === false || value === "false") return false;
        throw new Error(`${key} must be a boolean.`);
    }

    let normalized = rule.type === "url" ? normalizeUrl(value, key) : String(value ?? "").trim();

    if (rule.required && !normalized) throw new Error(`${key} is required.`);
    if (rule.maxLength && normalized.length > rule.maxLength) {
        throw new Error(`${key} must be ${rule.maxLength} characters or fewer.`);
    }

    if (rule.type === "twitter" && normalized) {
        if (!normalized.startsWith("@")) normalized = `@${normalized}`;
        if (!/^@[A-Za-z0-9_]{1,15}$/.test(normalized)) {
            throw new Error(`${key} must be a valid X / Twitter handle.`);
        }
    }

    if (rule.type === "locale" && !/^[a-z]{2}_[A-Z]{2}$/.test(normalized)) {
        throw new Error(`${key} must use language_REGION format, such as en_IN.`);
    }

    return normalized;
}

export function normalizeSeoUpdates(settings) {
    if (!Array.isArray(settings)) throw new Error("settings must be an array.");

    const provided = new Map(settings.map((setting) => [setting?.key, setting?.value]));
    const unknownKeys = [...provided.keys()].filter((key) => !SEO_RULES[key]);
    if (unknownKeys.length) throw new Error(`Unsupported SEO setting: ${unknownKeys[0]}.`);

    return SEO_SETTING_KEYS
        .filter((key) => provided.has(key))
        .map((key) => ({ key, value: normalizeSeoSetting(key, provided.get(key)) }));
}
