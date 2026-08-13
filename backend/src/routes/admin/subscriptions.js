/**
 * Subscription Management Routes
 * /api/admin/subscriptions
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Subscription } from "../../models/Subscription.js";
import { Plan } from "../../models/Plan.js";
import { User } from "../../models/User.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, isEnum, stripUndefined } from "../../lib/validate.js";
import { SUBSCRIPTION_STATUSES } from "../../models/Subscription.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── List Subscriptions ────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "startDate", "endDate"]);
    const filter = {};

    if (req.query.status && SUBSCRIPTION_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.tenant && isMongoId(req.query.tenant)) {
      filter.tenant = req.query.tenant;
    }

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("tenant", "name email business plan")
        .populate("plan", "name slug interval price currency")
        .lean(),
      Subscription.countDocuments(filter),
    ]);

    return res.json({
      subscriptions: subscriptions.map(formatSubscription),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Get Single Subscription ───────────────────────────────────
router.get("/:subId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.subId))
      return res.status(400).json({ message: "Invalid subscription ID." });

    const sub = await Subscription.findById(req.params.subId)
      .populate("tenant", "name email business")
      .populate("plan", "name slug interval price currency limits features")
      .lean();

    if (!sub) return res.status(404).json({ message: "Subscription not found." });

    return res.json({ subscription: formatSubscription(sub) });
  } catch (error) {
    return next(error);
  }
});

// ── Assign / Create Subscription for Tenant ───────────────────
router.post("/", async (req, res, next) => {
  try {
    const { tenantId, planId, startDate, endDate, trialDays, notes, coupon } = req.body ?? {};

    if (!isMongoId(tenantId)) return res.status(400).json({ message: "Valid tenantId is required." });
    if (!isMongoId(planId)) return res.status(400).json({ message: "Valid planId is required." });

    const [tenant, plan] = await Promise.all([
      User.findOne({ _id: tenantId, role: "tenant" }),
      Plan.findById(planId),
    ]);

    if (!tenant) return res.status(404).json({ message: "Tenant not found." });
    if (!plan) return res.status(404).json({ message: "Plan not found." });

    const start = startDate ? new Date(startDate) : new Date();
    let end = endDate ? new Date(endDate) : null;
    if (!end) {
      // Auto-calculate end date
      if (plan.interval === "monthly") end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
      else if (plan.interval === "yearly") end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    }

    const trialEndsAt = trialDays ? new Date(start.getTime() + trialDays * 24 * 60 * 60 * 1000) : undefined;

    const subscription = await Subscription.create({
      tenant: tenantId,
      plan: planId,
      planSnapshot: { name: plan.name, interval: plan.interval, price: plan.price, currency: plan.currency, limits: plan.limits },
      status: trialEndsAt ? "trialing" : "active",
      startDate: start,
      endDate: end,
      trialEndsAt,
      notes: notes?.trim() || "",
      coupon: coupon ?? undefined,
      limits: plan.limits,
      assignedBy: req.user._id,
    });

    // Update tenant plan
    await User.findByIdAndUpdate(tenantId, { plan: plan.slug || plan.name.toLowerCase().replace(/\s+/g, "-") });

    await logActivity({
      ...buildLogContext(req),
      action: "subscription_created",
      description: `Subscription to "${plan.name}" assigned to tenant ${tenant.name}.`,
      resource: { type: "subscription", id: String(subscription._id), name: plan.name },
    });

    return res.status(201).json({ subscription: formatSubscription(subscription.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Update Subscription ───────────────────────────────────────
router.patch("/:subId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.subId))
      return res.status(400).json({ message: "Invalid subscription ID." });

    const b = req.body ?? {};
    const update = stripUndefined({
      status: SUBSCRIPTION_STATUSES.includes(b.status) ? b.status : undefined,
      endDate: b.endDate ? new Date(b.endDate) : undefined,
      trialEndsAt: b.trialEndsAt ? new Date(b.trialEndsAt) : undefined,
      autoRenew: typeof b.autoRenew === "boolean" ? b.autoRenew : undefined,
      notes: b.notes?.trim(),
      limits: b.limits,
      cancellationReason: b.cancellationReason?.trim(),
    });

    if (update.status === "cancelled") update.cancelledAt = new Date();

    const sub = await Subscription.findByIdAndUpdate(req.params.subId, { $set: update }, { new: true })
      .populate("tenant", "name email")
      .populate("plan", "name");

    if (!sub) return res.status(404).json({ message: "Subscription not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "subscription_updated",
      description: `Subscription for ${sub.tenant?.name} updated.`,
      resource: { type: "subscription", id: String(sub._id), name: sub.plan?.name },
    });

    return res.json({ subscription: formatSubscription(sub.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Cancel Subscription ───────────────────────────────────────
router.post("/:subId/cancel", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.subId))
      return res.status(400).json({ message: "Invalid subscription ID." });

    const sub = await Subscription.findByIdAndUpdate(
      req.params.subId,
      { status: "cancelled", cancelledAt: new Date(), cancellationReason: req.body?.reason?.trim() || "" },
      { new: true },
    ).populate("tenant", "name email").populate("plan", "name");

    if (!sub) return res.status(404).json({ message: "Subscription not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "subscription_cancelled",
      description: `Subscription for ${sub.tenant?.name} cancelled. Reason: ${sub.cancellationReason || "None"}`,
      resource: { type: "subscription", id: String(sub._id), name: sub.plan?.name },
    });

    return res.json({ message: "Subscription cancelled.", subscription: formatSubscription(sub.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Helpers ───────────────────────────────────────────────────
function formatSubscription(s) {
  return {
    id: s._id,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    trialEndsAt: s.trialEndsAt,
    cancelledAt: s.cancelledAt,
    cancellationReason: s.cancellationReason,
    autoRenew: s.autoRenew,
    notes: s.notes,
    limits: s.limits,
    coupon: s.coupon,
    tenant: s.tenant ? {
      id: s.tenant._id || s.tenant,
      name: s.tenant.name,
      email: s.tenant.email,
      businessName: s.tenant.business?.name,
    } : { id: s.tenant },
    plan: s.plan ? {
      id: s.plan._id || s.plan,
      name: s.plan.name,
      interval: s.plan.interval,
      price: s.plan.price,
      currency: s.plan.currency,
    } : s.planSnapshot,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export default router;
