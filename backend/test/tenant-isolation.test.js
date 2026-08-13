import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { ownedDomainScope, ownedWebsiteScope, tenantId, tenantScope } from "../src/lib/tenant-scope.js";
import { establishTenantContext } from "../src/middleware/auth.js";
import { validateBusiness } from "../src/routes/tenants.js";

const tenantA = new mongoose.Types.ObjectId();
const websiteB = new mongoose.Types.ObjectId();
const domainB = new mongoose.Types.ObjectId();

function tenantUser(id = tenantA) {
    return { _id: id, role: "tenant" };
}

test("tenant scopes always use the authenticated tenant and never a caller-supplied tenant", () => {
    assert.deepEqual(tenantScope(tenantUser()), { tenant: tenantA });
    assert.deepEqual(tenantScope(tenantUser(), "tenantId"), { tenantId: tenantA });
    assert.deepEqual(ownedWebsiteScope(tenantUser(), websiteB), { _id: websiteB, owner: tenantA });
    assert.deepEqual(ownedDomainScope(tenantUser(), domainB), { _id: domainB, tenant: tenantA });
});

test("invalid resource IDs fail closed instead of producing an unscoped query", () => {
    assert.equal(ownedWebsiteScope(tenantUser(), "not-an-object-id"), null);
    assert.equal(ownedDomainScope(tenantUser(), "not-an-object-id"), null);
});

test("tenant context is established from authenticated user identity and cannot be overwritten", () => {
    const request = { user: tenantUser() };
    let nextCalled = false;
    establishTenantContext(request, { status() { return this; }, json() { } }, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(request.tenantId, tenantA);
    assert.throws(() => { request.tenantId = new mongoose.Types.ObjectId(); }, TypeError);
});

test("non-tenant callers cannot establish tenant context", () => {
    const request = { user: { _id: tenantA, role: "admin" } };
    let statusCode;
    let nextCalled = false;
    const response = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
    };

    establishTenantContext(request, response, () => { nextCalled = true; });

    assert.equal(statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(request.tenantId, undefined);
});

test("cross-tenant website, form, asset, and domain IDs remain scoped to Tenant A", () => {
    const websiteQuery = ownedWebsiteScope(tenantUser(), websiteB);
    const formQuery = { websiteId: websiteB, ...tenantScope(tenantUser(), "tenantId") };
    const assetQuery = { _id: new mongoose.Types.ObjectId(), ...tenantScope(tenantUser()), website: websiteB };
    const domainQuery = ownedDomainScope(tenantUser(), domainB);

    assert.equal(String(websiteQuery.owner), String(tenantA));
    assert.equal(String(formQuery.tenantId), String(tenantA));
    assert.equal(String(assetQuery.tenant), String(tenantA));
    assert.equal(String(domainQuery.tenant), String(tenantA));
    assert.notEqual(String(websiteQuery.owner), String(websiteB));
    assert.notEqual(String(domainQuery.tenant), String(domainB));
});

test("business validation trims supported fields and rejects missing names", () => {
    const result = validateBusiness({ name: "  Acme Studio  ", email: " hello@acme.test ", logoUrl: "", faviconUrl: "", address: "", phone: "", description: "" });
    assert.deepEqual(result.business, { name: "Acme Studio", email: "hello@acme.test", logoUrl: "", faviconUrl: "", address: "", phone: "", description: "" });
    assert.equal(validateBusiness({ name: "", email: "", logoUrl: "", faviconUrl: "", address: "", phone: "", description: "" }).error, "Business name is required.");
});

test("business validation rejects invalid contact, logo, and favicon values", () => {
    assert.match(validateBusiness({ name: "Acme", email: "not-an-email", logoUrl: "", faviconUrl: "", address: "", phone: "", description: "" }).error, /valid business email/);
    assert.match(validateBusiness({ name: "Acme", email: "", logoUrl: "javascript:alert(1)", faviconUrl: "", address: "", phone: "", description: "" }).error, /Logo URL/);
    assert.match(validateBusiness({ name: "Acme", email: "", logoUrl: "", faviconUrl: "javascript:alert(1)", address: "", phone: "", description: "" }).error, /Favicon URL/);
});
