/**
 * Domain Management Routes
 * /api/admin/domains
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Domain, DOMAIN_STATUSES, SSL_STATUSES } from "../../models/Domain.js";
import { Website } from "../../models/Website.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, stripUndefined } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── List Domains ──────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "domain", "expiresAt"]);
    const filter = {};

    if (req.query.status && DOMAIN_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.sslStatus && SSL_STATUSES.includes(req.query.sslStatus)) filter.sslStatus = req.query.sslStatus;
    if (req.query.tenant && isMongoId(req.query.tenant)) filter.tenant = req.query.tenant;

    if (req.query.expiringSoon === "true") {
      filter.expiresAt = { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
    }

    if (req.query.search && typeof req.query.search === "string") {
      const { escapeRegex } = await import("../../lib/validate.js");
      filter.domain = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
    }

    const [domains, total] = await Promise.all([
      Domain.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("tenant", "name email business")
        .populate("website", "name status")
        .lean(),
      Domain.countDocuments(filter),
    ]);

    return res.json({
      domains: domains.map(formatDomain),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Get Domain ────────────────────────────────────────────────
router.get("/:domainId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.domainId))
      return res.status(400).json({ message: "Invalid domain ID." });

    const domain = await Domain.findById(req.params.domainId)
      .populate("tenant", "name email business")
      .populate("website", "name status")
      .lean();

    if (!domain) return res.status(404).json({ message: "Domain not found." });

    return res.json({ domain: formatDomain(domain) });
  } catch (error) {
    return next(error);
  }
});

// ── Add Domain ────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const b = req.body ?? {};

    if (!isMongoId(b.tenant)) return res.status(400).json({ message: "Valid tenant ID is required." });
    if (typeof b.domain !== "string" || !b.domain.trim()) return res.status(400).json({ message: "domain is required." });
    if (b.website) {
      if (!isMongoId(b.website)) return res.status(400).json({ message: "Valid website ID is required." });
      const website = await Website.exists({ _id: b.website, owner: b.tenant });
      if (!website) return res.status(400).json({ message: "Website must belong to the selected tenant." });
    }

    const normalizedDomain = b.domain.trim().toLowerCase();

    if (await Domain.exists({ domain: normalizedDomain }))
      return res.status(409).json({ message: "This domain is already registered." });

    const domain = await Domain.create({
      tenant: b.tenant,
      website: b.website || undefined,
      domain: normalizedDomain,
      isSubdomain: normalizedDomain.split(".").length > 2,
      isPrimary: b.isPrimary ?? false,
      status: "pending_verification",
      sslStatus: "none",
      registrar: b.registrar?.trim() || "",
      notes: b.notes?.trim() || "",
      addedBy: req.user._id,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "domain_added",
      description: `Domain "${normalizedDomain}" added for tenant.`,
      resource: { type: "domain", id: String(domain._id), name: normalizedDomain },
    });

    return res.status(201).json({ domain: formatDomain(domain.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Update Domain ─────────────────────────────────────────────
router.patch("/:domainId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.domainId))
      return res.status(400).json({ message: "Invalid domain ID." });

    const b = req.body ?? {};
    const update = stripUndefined({
      status: DOMAIN_STATUSES.includes(b.status) ? b.status : undefined,
      sslStatus: SSL_STATUSES.includes(b.sslStatus) ? b.sslStatus : undefined,
      isPrimary: typeof b.isPrimary === "boolean" ? b.isPrimary : undefined,
      autoRenew: typeof b.autoRenew === "boolean" ? b.autoRenew : undefined,
      sslExpiresAt: b.sslExpiresAt ? new Date(b.sslExpiresAt) : undefined,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      notes: b.notes?.trim(),
      registrar: b.registrar?.trim(),
      dnsRecords: b.dnsRecords,
    });

    if (update.status === "active") update.verifiedAt = new Date();

    const domain = await Domain.findByIdAndUpdate(req.params.domainId, { $set: update }, { new: true });
    if (!domain) return res.status(404).json({ message: "Domain not found." });

    if (update.status === "active") {
      await logActivity({
        ...buildLogContext(req),
        action: "domain_verified",
        description: `Domain "${domain.domain}" verified and set to active.`,
        resource: { type: "domain", id: String(domain._id), name: domain.domain },
      });
    }

    return res.json({ domain: formatDomain(domain.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Remove Domain ─────────────────────────────────────────────
router.delete("/:domainId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.domainId))
      return res.status(400).json({ message: "Invalid domain ID." });

    const domain = await Domain.findByIdAndDelete(req.params.domainId);
    if (!domain) return res.status(404).json({ message: "Domain not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "domain_removed",
      description: `Domain "${domain.domain}" removed.`,
      resource: { type: "domain", id: String(domain._id), name: domain.domain },
    });

    return res.json({ message: "Domain removed." });
  } catch (error) {
    return next(error);
  }
});

// ── Domain Stats ──────────────────────────────────────────────
router.get("/stats/overview", async (req, res, next) => {
  try {
    const stats = await Domain.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const sslStats = await Domain.aggregate([
      { $group: { _id: "$sslStatus", count: { $sum: 1 } } },
    ]);

    const expiringSoon = await Domain.countDocuments({
      status: "active",
      expiresAt: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return res.json({ byStatus: stats, bySslStatus: sslStats, expiringSoon });
  } catch (error) {
    return next(error);
  }
});

function formatDomain(d) {
  return {
    id: d._id,
    domain: d.domain,
    isSubdomain: d.isSubdomain,
    isPrimary: d.isPrimary,
    status: d.status,
    sslStatus: d.sslStatus,
    sslExpiresAt: d.sslExpiresAt,
    expiresAt: d.expiresAt,
    autoRenew: d.autoRenew,
    verifiedAt: d.verifiedAt,
    registrar: d.registrar,
    notes: d.notes,
    dnsRecords: d.dnsRecords,
    tenant: d.tenant ? { id: d.tenant._id || d.tenant, name: d.tenant.name, email: d.tenant.email } : { id: d.tenant },
    website: d.website ? { id: d.website._id || d.website, name: d.website.name, status: d.website.status } : null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export default router;
