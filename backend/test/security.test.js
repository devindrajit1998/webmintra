import test from "node:test";
import assert from "node:assert/strict";
import {
    issueCsrfToken,
    requireCsrfToken,
    requireTrustedOrigin,
    sessionCookieOptions,
    validateProductionSecurityConfig,
} from "../src/middleware/security.js";

const originalEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
    JWT_SECRET: process.env.JWT_SECRET,
};

function setEnvironment({ nodeEnv = "production", origin = "https://app.webmintra.test" } = {}) {
    process.env.NODE_ENV = nodeEnv;
    process.env.FRONTEND_ORIGIN = origin;
    process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-characters";
}

function request({ method = "POST", origin = "https://app.webmintra.test", path = "/api/websites", cookies = {}, token } = {}) {
    return {
        method,
        path,
        cookies,
        get(name) {
            if (name.toLowerCase() === "origin") return origin;
            if (name.toLowerCase() === "x-csrf-token") return token;
            return undefined;
        },
    };
}

function response() {
    return {
        statusCode: 200,
        body: undefined,
        cookies: {},
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        cookie(name, value, options) { this.cookies[name] = { value, options }; return this; },
    };
}

test.after(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

test("unsafe requests require an allowlisted origin in production", () => {
    setEnvironment();
    let trustedNext = false;
    requireTrustedOrigin(request(), response(), () => { trustedNext = true; });
    assert.equal(trustedNext, true);

    const rejected = response();
    let rejectedNext = false;
    requireTrustedOrigin(request({ origin: "https://attacker.test" }), rejected, () => { rejectedNext = true; });
    assert.equal(rejectedNext, false);
    assert.equal(rejected.statusCode, 403);
    assert.equal(rejected.body.message, "Request origin is not allowed.");
});

test("CSRF protection rejects missing and mismatched tokens and accepts a signed match", () => {
    setEnvironment();
    const issued = response();
    const token = issueCsrfToken(request({ method: "GET" }), issued);
    assert.equal(issued.cookies.webmintra_csrf.value, token);
    assert.equal(issued.cookies.webmintra_csrf.options.httpOnly, true);

    const missing = response();
    requireCsrfToken(request(), missing, () => assert.fail("missing token reached handler"));
    assert.equal(missing.statusCode, 403);

    const mismatched = response();
    requireCsrfToken(request({ cookies: { webmintra_csrf: token }, token: `${token}x` }), mismatched, () => assert.fail("mismatched token reached handler"));
    assert.equal(mismatched.statusCode, 403);

    let validNext = false;
    requireCsrfToken(request({ cookies: { webmintra_csrf: token }, token }), response(), () => { validNext = true; });
    assert.equal(validNext, true);
});

test("safe methods and public published-site events do not require CSRF tokens", () => {
    setEnvironment();
    let safeNext = false;
    requireCsrfToken(request({ method: "GET" }), response(), () => { safeNext = true; });
    assert.equal(safeNext, true);

    let formNext = false;
    const formRequest = request({ path: "/api/public/site/example.com/form", origin: "https://example.com" });
    requireTrustedOrigin(formRequest, response(), () => {
        requireCsrfToken(formRequest, response(), () => { formNext = true; });
    });
    assert.equal(formNext, true);

    let analyticsNext = false;
    const analyticsRequest = request({ path: "/api/public/site/example.com/analytics", origin: "https://example.com" });
    requireTrustedOrigin(analyticsRequest, response(), () => {
        requireCsrfToken(analyticsRequest, response(), () => { analyticsNext = true; });
    });
    assert.equal(analyticsNext, true);
});

test("production configuration requires HTTPS origins and secure cookies", () => {
    setEnvironment({ origin: "http://app.webmintra.test" });
    assert.throws(() => validateProductionSecurityConfig(), /must use HTTPS/);

    setEnvironment({ origin: "https://app.webmintra.test,https://admin.webmintra.test" });
    assert.doesNotThrow(() => validateProductionSecurityConfig());
    assert.equal(sessionCookieOptions().secure, true);
    assert.equal(sessionCookieOptions().httpOnly, true);
    assert.equal(sessionCookieOptions().sameSite, "strict");
});
