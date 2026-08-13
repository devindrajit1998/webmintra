import { Router } from "express";
import dns from "dns/promises";
import mongoose from "mongoose";
import { establishTenantContext, requireAuthenticatedUser, requireRole } from "../middleware/auth.js";
import { Domain } from "../models/Domain.js";
import { Website } from "../models/Website.js";
import { ownedDomainScope, ownedWebsiteScope, tenantScope } from "../lib/tenant-scope.js";

const router = Router();

// ── Constants ────────────────────────────────────────────────────
const CNAME_TARGET = "cname.webmintra.cloud";

// Validates that a string is a syntactically valid domain/hostname
const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9-_]+\.[a-zA-Z]{2,}$/;

function isValidDomain(domain) {
  return typeof domain === "string" && DOMAIN_REGEX.test(domain) && domain.length <= 253;
}

function domainResponse(domain) {
  return {
    id: domain._id?.toString(),
    domain: domain.domain,
    websiteId: domain.website?.toString(),
    status: domain.status,
    sslStatus: domain.sslStatus,
    verifiedAt: domain.verifiedAt,
    lastCheckedAt: domain.lastCheckedAt,
    dnsRecords: domain.dnsRecords,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  };
}

router.use(requireAuthenticatedUser, requireRole("tenant"), establishTenantContext);

// ── GET / - List all domains for authenticated tenant ────────────
router.get("/", async (req, res, next) => {
  try {
    const domains = await Domain.find(tenantScope(req.user)).sort({ createdAt: -1 });
    return res.json({ domains: domains.map(domainResponse) });
  } catch (error) {
    return next(error);
  }
});

// ── POST / - Add a new custom domain ────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { domain, websiteId } = req.body;

    if (!domain || !isValidDomain(domain.trim())) {
      return res.status(400).json({
        message: "Invalid domain name. Please enter a valid domain (e.g. www.mycompany.com).",
      });
    }

    if (!websiteId || !mongoose.isObjectIdOrHexString(websiteId)) {
      return res.status(400).json({ message: "A valid websiteId is required." });
    }

    const cleanDomain = domain.trim().toLowerCase();

    // Strip protocol if user accidentally typed it
    if (cleanDomain.startsWith("http://") || cleanDomain.startsWith("https://")) {
      return res.status(400).json({
        message: "Enter the domain name only, without https:// or http://.",
      });
    }

    // Verify website belongs to this tenant
    const website = await Website.findOne(ownedWebsiteScope(req.user, websiteId));
    if (!website) {
      return res.status(404).json({ message: "Website not found or does not belong to you." });
    }

    // Check if domain is already registered (globally, not just this tenant)
    const existing = await Domain.findOne({ domain: cleanDomain });
    if (existing) {
      return res.status(409).json({
        message: "This domain is already registered in the system.",
      });
    }

    const newDomain = await Domain.create({
      tenant: req.user._id,
      website: websiteId,
      domain: cleanDomain,
      status: "pending_verification",
      sslStatus: "none",
      addedBy: req.user._id,
    });

    return res.status(201).json({ domain: domainResponse(newDomain) });
  } catch (error) {
    return next(error);
  }
});

// ── DELETE /:domainId - Remove a custom domain ───────────────────
router.delete("/:domainId", async (req, res, next) => {
  try {
    const { domainId } = req.params;

    if (!mongoose.isObjectIdOrHexString(domainId)) {
      return res.status(400).json({ message: "Invalid domain ID." });
    }

    const domain = await Domain.findOneAndDelete(ownedDomainScope(req.user, domainId));
    if (!domain) {
      return res.status(404).json({ message: "Domain not found." });
    }

    return res.json({ message: "Domain removed successfully." });
  } catch (error) {
    return next(error);
  }
});

// ── POST /:domainId/verify - Real DNS CNAME + A record check ─────
router.post("/:domainId/verify", async (req, res, next) => {
  try {
    const { domainId } = req.params;

    if (!mongoose.isObjectIdOrHexString(domainId)) {
      return res.status(400).json({ message: "Invalid domain ID." });
    }

    const domain = await Domain.findOne(ownedDomainScope(req.user, domainId));
    if (!domain) {
      return res.status(404).json({ message: "Domain not found." });
    }

    domain.lastCheckedAt = new Date();

    let verified = false;
    let resolvedRecords = [];
    let failReason = null;

    // Step 1: Try CNAME resolution (works for www.* and subdomains)
    try {
      const cnames = await dns.resolveCname(domain.domain);
      resolvedRecords = cnames.map((c) => ({ type: "CNAME", name: domain.domain, value: c, ttl: 0, verified: false }));

      if (cnames.some((c) => c.toLowerCase() === CNAME_TARGET)) {
        verified = true;
        resolvedRecords = resolvedRecords.map((r) => ({
          ...r,
          verified: r.value.toLowerCase() === CNAME_TARGET,
        }));
      } else {
        failReason = `CNAME record found but does not point to ${CNAME_TARGET}. Found: ${cnames.join(", ")}`;
      }
    } catch (cnameError) {
      // Step 2: If no CNAME, fall back to A record check (for apex/root domains)
      // Apex domains cannot use CNAME, so we accept A record pointing to our server IP
      try {
        const serverIp = process.env.SERVER_IP;
        if (serverIp) {
          const aRecords = await dns.resolve4(domain.domain);
          resolvedRecords = aRecords.map((ip) => ({ type: "A", name: domain.domain, value: ip, ttl: 0, verified: false }));

          if (aRecords.includes(serverIp)) {
            verified = true;
            resolvedRecords = resolvedRecords.map((r) => ({
              ...r,
              verified: r.value === serverIp,
            }));
          } else {
            failReason = `A record found but does not point to the server IP (${serverIp}). Found: ${aRecords.join(", ")}`;
          }
        } else {
          failReason = "No CNAME record found for this domain. Please add a CNAME record pointing to " + CNAME_TARGET;
        }
      } catch (aError) {
        failReason = "Domain DNS could not be resolved. Please ensure the CNAME record is added and has had time to propagate (up to 48 hours).";
      }
    }

    // Persist DNS check results
    domain.dnsRecords = resolvedRecords;

    if (verified) {
      domain.status = "active";
      // SSL is pending external provisioning (e.g. Let's Encrypt, Cloudflare)
      // We do NOT mark it active here since we haven't provisioned a certificate
      domain.sslStatus = "pending";
      domain.verifiedAt = new Date();
      await domain.save();
      return res.json({
        domain: domainResponse(domain),
        message: "Domain verified successfully! SSL certificate provisioning may take up to a few minutes.",
      });
    } else {
      domain.status = "pending_verification";
      await domain.save();
      return res.status(400).json({
        domain: domainResponse(domain),
        message: failReason || "DNS verification failed.",
      });
    }
  } catch (error) {
    return next(error);
  }
});

export default router;


