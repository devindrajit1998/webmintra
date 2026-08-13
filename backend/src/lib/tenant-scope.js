import mongoose from "mongoose";

export function tenantId(user) {
    if (!user?._id) throw new Error("Authenticated tenant identity is required.");
    return user._id;
}

export function tenantScope(user, field = "tenant") {
    return { [field]: tenantId(user) };
}

export function ownedWebsiteScope(user, websiteId) {
    if (!mongoose.isObjectIdOrHexString(websiteId)) return null;
    return { _id: websiteId, owner: tenantId(user) };
}

export function ownedDomainScope(user, domainId) {
    if (!mongoose.isObjectIdOrHexString(domainId)) return null;
    return { _id: domainId, tenant: tenantId(user) };
}
