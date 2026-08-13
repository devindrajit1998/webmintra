import crypto from "node:crypto";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_COOKIE_NAME = "webmintra_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_MAX_AGE_MS = 60 * 60 * 1000;

function isProduction() {
    return process.env.NODE_ENV === "production";
}

function normalizedOrigin(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value.trim());
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
            return null;
        return url.origin;
    } catch {
        return null;
    }
}

export function allowedOrigins() {
    const configured = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
        .split(",")
        .map(normalizedOrigin)
        .filter(Boolean);
    return new Set(configured);
}

export function validateProductionSecurityConfig() {
    if (!isProduction()) return;
    const origins = allowedOrigins();
    if (!process.env.FRONTEND_ORIGIN || origins.size === 0)
        throw new Error("FRONTEND_ORIGIN must contain at least one valid origin in production.");
    for (const origin of origins) {
        if (!origin.startsWith("https://"))
            throw new Error("FRONTEND_ORIGIN entries must use HTTPS in production.");
    }
}

export function corsOptions() {
    const origins = allowedOrigins();
    return {
        origin(origin, callback) {
            if (!origin || origins.has(normalizedOrigin(origin))) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", CSRF_HEADER_NAME],
        exposedHeaders: [],
        maxAge: isProduction() ? 600 : 0,
        optionsSuccessStatus: 204,
    };
}

export function sessionCookieOptions() {
    return {
        httpOnly: true,
        secure: isProduction(),
        sameSite: "strict",
        maxAge: CSRF_MAX_AGE_MS,
        path: "/",
    };
}

function csrfCookieOptions() {
    return {
        httpOnly: true,
        secure: isProduction(),
        sameSite: "strict",
        maxAge: CSRF_MAX_AGE_MS,
        path: "/",
    };
}

function signCsrfNonce(nonce) {
    return crypto.createHmac("sha256", process.env.JWT_SECRET).update(nonce).digest("base64url");
}

function createCsrfToken() {
    const nonce = crypto.randomBytes(32).toString("base64url");
    return `${nonce}.${signCsrfNonce(nonce)}`;
}

function safelyEqual(left, right) {
    if (typeof left !== "string" || typeof right !== "string") return false;
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validCsrfSignature(token) {
    if (typeof token !== "string") return false;
    const separator = token.indexOf(".");
    if (separator < 1) return false;
    const nonce = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    return safelyEqual(signature, signCsrfNonce(nonce));
}

export function issueCsrfToken(request, response) {
    const existing = request.cookies?.[CSRF_COOKIE_NAME];
    const token = validCsrfSignature(existing) ? existing : createCsrfToken();
    response.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
    return token;
}

export function clearSecurityCookies(response) {
    const common = { httpOnly: true, secure: isProduction(), sameSite: "strict", path: "/" };
    response.clearCookie("webmintra_session", common);
    response.clearCookie(CSRF_COOKIE_NAME, common);
}

function isPublicSiteEvent(request) {
    return request.method === "POST" && /^\/api\/public\/site\/[^/]+\/(form|analytics)\/?$/.test(request.path);
}

export function requireTrustedOrigin(request, response, next) {
    if (SAFE_METHODS.has(request.method) || isPublicSiteEvent(request)) return next();

    const origin = normalizedOrigin(request.get("origin"));
    if (origin && allowedOrigins().has(origin)) return next();

    if (!origin && !isProduction()) return next();
    return response.status(403).json({ message: "Request origin is not allowed." });
}

export function requireCsrfToken(request, response, next) {
    if (SAFE_METHODS.has(request.method) || isPublicSiteEvent(request)) return next();

    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = request.get(CSRF_HEADER_NAME);
    if (validCsrfSignature(cookieToken) && safelyEqual(cookieToken, headerToken)) return next();

    return response.status(403).json({ message: "CSRF validation failed." });
}

export const securityConstants = Object.freeze({
    csrfCookieName: CSRF_COOKIE_NAME,
    csrfHeaderName: CSRF_HEADER_NAME,
});
