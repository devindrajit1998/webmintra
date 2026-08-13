/**
 * Subscription Plan Management Routes
 * /api/admin/plans
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Plan, PLAN_INTERVALS, PLAN_STATUSES } from "../../models/Plan.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, isMongoId, isString, isNumber, isEnum, stripUndefined } from "../../lib/validate.js";
import {
  effectiveSeoPlanFeatures,
  normalizeSeoPlanFeatures,
} from "../../lib/seo-plan-features.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// Helper: extract and coerce limits from body
function parseLimits(b) {
  if (!b.limits) return undefined;
  const l = b.limits;
  const coerce = (v) => (v === undefined ? undefined : Math.max(0, Number(v) || 0));
  return stripUndefined({
    websites: coerce(l.websites),
    pagesPerWebsite: coerce(l.pagesPerWebsite),
    customDomains: coerce(l.customDomains),
    storageMb: coerce(l.storageMb),
    bandwidthGb: coerce(l.bandwidthGb),
    collaborators: coerce(l.collaborators),
    emailsPerMonth: coerce(l.emailsPerMonth),
    aiCreditsPerMonth: coerce(l.aiCreditsPerMonth),
  });
}

// Helper: extract boolean feature flags from body
function parseFeatures(b) {
  if (!b.features) return undefined;
  const f = b.features;
  const bool = (v) => (v === undefined ? undefined : Boolean(v));
  return stripUndefined({
    customDomain: bool(f.customDomain),
    removeBranding: bool(f.removeBranding),
    apiAccess: bool(f.apiAccess),
    prioritySupport: bool(f.prioritySupport),
    analytics: bool(f.analytics),
    seoTools: bool(f.seoTools),
    formSubmissions: bool(f.formSubmissions),
    passwordProtectedPages: bool(f.passwordProtectedPages),
  });
}

function parseSeoFeatures(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const error = new Error("seoFeatures must be an object.");
    error.status = 400;
    throw error;
  }
  try {
    return normalizeSeoPlanFeatures(value);
  } catch (error) {
    error.status = 400;
    throw error;
  }
}

function planResponse(plan) {
  const value = typeof plan?.toObject === "function" ? plan.toObject() : plan;
  return {
    ...value,
    displayName: value?.slug === "pro" ? "Business" : value?.name,
    seoFeatures: effectiveSeoPlanFeatures(value?.slug, value?.seoFeatures),
  };
}

function handleRouteError(error, res, next) {
  if (error?.status === 400) return res.status(400).json({ message: error.message });
  return next(error);
}

// ── List Plans ────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.interval) filter.interval = req.query.interval;

    const [plans, total] = await Promise.all([
      Plan.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Plan.countDocuments(filter),
    ]);

    return res.json({
      plans: plans.map(planResponse),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      intervals: PLAN_INTERVALS,
      statuses: PLAN_STATUSES,
    });
  } catch (error) {
    return next(error);
  }
});

// ── Get Single Plan ───────────────────────────────────────────
router.get("/:planId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.planId))
      return res.status(400).json({ message: "Invalid plan ID." });
    const plan = await Plan.findById(req.params.planId).lean();
    if (!plan) return res.status(404).json({ message: "Plan not found." });
    return res.json({ plan: planResponse(plan) });
  } catch (error) {
    return next(error);
  }
});

// ── Create Plan ───────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const errors = [];

    if (!isString(b.name, { max: 80 })) errors.push("name is required (max 80 chars).");
    if (!isString(b.slug, { max: 80 }) || !/^[a-z0-9-]+$/.test(b.slug))
      errors.push("slug must be lowercase alphanumeric with hyphens.");
    if (!b.pricing || typeof b.pricing !== "object") errors.push("pricing object is required.");
    else {
      if (b.pricing.monthly !== null && !isNumber(b.pricing.monthly, { min: 0 }))
        errors.push("pricing.monthly must be a non-negative number or null.");
      if (b.pricing.yearly !== null && !isNumber(b.pricing.yearly, { min: 0 }))
        errors.push("pricing.yearly must be a non-negative number or null.");
    }

    if (errors.length) return res.status(400).json({ message: errors.join(" "), errors });

    if (await Plan.exists({ slug: b.slug.toLowerCase() }))
      return res.status(409).json({ message: "A plan with this slug already exists." });

    const planSlug = b.slug.toLowerCase().trim();
    const seoFeatures = parseSeoFeatures(b.seoFeatures);
    const plan = await Plan.create({
      name: b.name.trim(),
      slug: planSlug,
      description: b.description?.trim() || "",
      pricing: {
        monthly: b.pricing?.monthly ?? null,
        yearly: b.pricing?.yearly ?? null,
      },
      currency: b.currency?.toUpperCase() || "INR",
      trialDays: b.trialDays ?? 0,
      limits: {
        websites: b.limits?.websites ?? 1,
        pagesPerWebsite: b.limits?.pagesPerWebsite ?? 5,
        customDomains: b.limits?.customDomains ?? 0,
        storageMb: b.limits?.storageMb ?? 500,
        bandwidthGb: b.limits?.bandwidthGb ?? 10,
        collaborators: b.limits?.collaborators ?? 1,
        emailsPerMonth: b.limits?.emailsPerMonth ?? 0,
        aiCreditsPerMonth: b.limits?.aiCreditsPerMonth ?? 0,
      },
      features: {
        customDomain: b.features?.customDomain ?? false,
        removeBranding: b.features?.removeBranding ?? false,
        apiAccess: b.features?.apiAccess ?? false,
        prioritySupport: b.features?.prioritySupport ?? false,
        analytics: b.features?.analytics ?? false,
        seoTools: b.features?.seoTools ?? false,
        formSubmissions: b.features?.formSubmissions ?? true,
        passwordProtectedPages: b.features?.passwordProtectedPages ?? false,
      },
      seoFeatures: seoFeatures ?? effectiveSeoPlanFeatures(planSlug),
      highlights: Array.isArray(b.highlights) ? b.highlights : [],
      sortOrder: b.sortOrder ?? 0,
      isPublic: b.isPublic !== undefined ? Boolean(b.isPublic) : true,
      createdBy: req.user._id,
    });

    await logActivity({
      ...buildLogContext(req),
      action: "plan_created",
      description: `Plan "${plan.name}" created.`,
      resource: { type: "plan", id: String(plan._id), name: plan.name },
      metadata: { seoEntitlementKeys: Object.keys(plan.seoFeatures?.toObject?.() ?? plan.seoFeatures ?? {}) },
    });

    return res.status(201).json({ plan: planResponse(plan) });
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

// ── Update Plan ───────────────────────────────────────────────
router.patch("/:planId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.planId))
      return res.status(400).json({ message: "Invalid plan ID." });

    const b = req.body ?? {};
    const limits = parseLimits(b);
    const features = parseFeatures(b);
    const seoFeatures = parseSeoFeatures(b.seoFeatures);
    const previousPlan = seoFeatures
      ? await Plan.findById(req.params.planId).select("seoFeatures").lean()
      : null;

    const update = stripUndefined({
      name: b.name?.trim(),
      description: b.description?.trim(),
      currency: b.currency?.toUpperCase(),
      trialDays: b.trialDays,
      sortOrder: b.sortOrder,
      isPublic: b.isPublic !== undefined ? Boolean(b.isPublic) : undefined,
      status: b.status,
      highlights: b.highlights,
    });

    // Merge limits and features as dot-notation to allow partial updates
    if (b.pricing) {
      if (b.pricing.monthly !== undefined) update[`pricing.monthly`] = b.pricing.monthly;
      if (b.pricing.yearly !== undefined) update[`pricing.yearly`] = b.pricing.yearly;
    }

    if (limits) {
      for (const [key, val] of Object.entries(limits)) {
        update[`limits.${key}`] = val;
      }
    }
    if (features) {
      for (const [key, val] of Object.entries(features)) {
        update[`features.${key}`] = val;
      }
    }
    if (seoFeatures) {
      for (const [key, val] of Object.entries(seoFeatures)) {
        update[`seoFeatures.${key}`] = val;
      }
    }

    const plan = await Plan.findByIdAndUpdate(req.params.planId, { $set: update }, { new: true });
    if (!plan) return res.status(404).json({ message: "Plan not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "plan_updated",
      description: `Plan "${plan.name}" updated.`,
      resource: { type: "plan", id: String(plan._id), name: plan.name },
      changes: seoFeatures ? {
        before: { seoFeatures: previousPlan?.seoFeatures ?? {} },
        after: { seoFeatures: plan.seoFeatures?.toObject?.() ?? plan.seoFeatures ?? {} },
      } : undefined,
      metadata: seoFeatures ? { seoEntitlementKeys: Object.keys(seoFeatures) } : undefined,
    });

    return res.json({ plan: planResponse(plan) });
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

// ── Archive / Delete Plan ──────────────────────────────────────
router.delete("/:planId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.planId))
      return res.status(400).json({ message: "Invalid plan ID." });

    const plan = await Plan.findByIdAndUpdate(
      req.params.planId,
      { status: "archived" },
      { new: true },
    );
    if (!plan) return res.status(404).json({ message: "Plan not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "plan_archived",
      description: `Plan "${plan.name}" archived.`,
      resource: { type: "plan", id: String(plan._id), name: plan.name },
    });

    return res.json({ message: "Plan archived." });
  } catch (error) {
    return next(error);
  }
});

export default router;
