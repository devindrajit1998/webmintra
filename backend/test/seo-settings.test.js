import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSeoSetting, normalizeSeoUpdates, SEO_SETTING_KEYS } from "../src/lib/seo-settings.js";

test("normalizes supported landing page SEO values", () => {
    assert.equal(normalizeSeoSetting("seo.defaultTitle", "  WebMintra Home  "), "WebMintra Home");
    assert.equal(normalizeSeoSetting("seo.allowIndexing", "false"), false);
    assert.equal(normalizeSeoSetting("seo.twitterHandle", "webmintra"), "@webmintra");
    assert.equal(normalizeSeoSetting("seo.canonicalUrl", "https://webmintra.in"), "https://webmintra.in/");
});

test("normalizes only provided keys in canonical key order", () => {
    const updates = normalizeSeoUpdates([
        { key: "seo.allowIndexing", value: true },
        { key: "seo.defaultDescription", value: "A website builder for small businesses." },
    ]);

    assert.deepEqual(updates, [
        { key: "seo.defaultDescription", value: "A website builder for small businesses." },
        { key: "seo.allowIndexing", value: true },
    ]);
    assert.equal(SEO_SETTING_KEYS.length, 10);
});

test("rejects invalid or unsafe SEO values", () => {
    assert.throws(() => normalizeSeoSetting("seo.defaultTitle", ""), /required/);
    assert.throws(() => normalizeSeoSetting("seo.canonicalUrl", "javascript:alert(1)"), /http or https/);
    assert.throws(() => normalizeSeoSetting("seo.locale", "en-in"), /language_REGION/);
    assert.throws(() => normalizeSeoSetting("seo.twitterHandle", "not a handle"), /valid X \/ Twitter handle/);
    assert.throws(() => normalizeSeoSetting("seo.allowIndexing", "yes"), /boolean/);
    assert.throws(() => normalizeSeoUpdates([{ key: "seo.unknown", value: "value" }]), /Unsupported SEO setting/);
});
