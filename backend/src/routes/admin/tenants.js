/**
 * Admin Tenant Management Routes
 * /api/admin/tenants
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { sessionCookieOptions } from "../../middleware/security.js";
import { User } from "../../models/User.js";
import { Invitation } from "../../models/Invitation.js";
import { Website } from "../../models/Website.js";
import { Subscription } from "../../models/Subscription.js";
import { Payment } from "../../models/Payment.js";
import { Domain } from "../../models/Domain.js";
import { ActivityLog } from "../../models/ActivityLog.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { parsePagination, parseSort, isMongoId, isEnum } from "../../lib/validate.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── List Tenants ──────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt", "updatedAt", "name", "email"]);

    const filter = { role: "tenant" };

    // Status filter
    if (req.query.status && ["invitation-sent", "active", "suspended", "archived"].includes(req.query.status)) {
      filter.tenantStatus = req.query.status;
    }

    // Plan filter
    if (req.query.plan && ["starter", "growth", "pro"].includes(req.query.plan)) {
      filter.plan = req.query.plan;
    }

    // Onboarding filter
    if (req.query.onboarded === "true") filter.onboardingCompletedAt = { $exists: true, $ne: null };
    if (req.query.onboarded === "false") filter.onboardingCompletedAt = { $exists: false };

    // Search
    if (req.query.search && typeof req.query.search === "string") {
      const q = req.query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { "business.name": { $regex: q, $options: "i" } },
      ];
    }

    const [tenants, total] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-passwordHash -emailVerification -passwordReset -phoneVerification")
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      tenants: tenants.map(formatTenant),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Get Single Tenant ─────────────────────────────────────────
router.get("/:tenantId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.tenantId))
      return res.status(400).json({ message: "Invalid tenant ID." });

    const tenant = await User.findOne({ _id: req.params.tenantId, role: "tenant" })
      .select("-passwordHash -emailVerification -passwordReset -phoneVerification")
      .lean();

    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    const [websites, subscription, payments, domains, recentActivity, invitation] = await Promise.all([
      Website.find({ owner: tenant._id }).select("name status templateName createdAt updatedAt").lean(),
      Subscription.findOne({ tenant: tenant._id }).sort({ createdAt: -1 }).populate("plan", "name interval price").lean(),
      Payment.find({ tenant: tenant._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Domain.find({ tenant: tenant._id }).select("domain status sslStatus isPrimary").lean(),
      ActivityLog.find({ "resource.id": String(tenant._id) })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Invitation.findById(tenant.invitationId).lean(),
    ]);

    // Build onboarding stages
    const stages = buildOnboardingStages(tenant, invitation, websites);

    return res.json({
      tenant: {
        ...formatTenant(tenant),
        phone: tenant.phone,
        isPhoneVerified: tenant.isPhoneVerified,
        isEmailVerified: tenant.isEmailVerified,
        invitedBy: invitation?.invitedBy,
        invitedAt: invitation?.createdAt,
        onboardingStages: stages,
      },
      websites: websites.map((w) => ({ id: w._id, name: w.name, status: w.status, templateName: w.templateName, createdAt: w.createdAt, updatedAt: w.updatedAt })),
      subscription: subscription ? formatSubscription(subscription) : null,
      recentPayments: payments.map(formatPayment),
      domains: domains.map((d) => ({ id: d._id, domain: d.domain, status: d.status, sslStatus: d.sslStatus, isPrimary: d.isPrimary })),
      recentActivity: recentActivity.map((a) => ({ id: a._id, action: a.action, description: a.description, createdAt: a.createdAt })),
    });
  } catch (error) {
    return next(error);
  }
});

// ── Update Tenant Status ──────────────────────────────────────
router.patch("/:tenantId/status", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.tenantId))
      return res.status(400).json({ message: "Invalid tenant ID." });

    const validStatuses = ["active", "suspended", "archived"];
    if (!isEnum(req.body?.status, validStatuses))
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}.` });

    const tenant = await User.findOneAndUpdate(
      { _id: req.params.tenantId, role: "tenant" },
      { tenantStatus: req.body.status },
      { new: true },
    ).select("-passwordHash -emailVerification -passwordReset -phoneVerification");

    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    const actionMap = { active: "tenant_activated", suspended: "tenant_suspended", archived: "tenant_archived" };
    await logActivity({
      ...buildLogContext(req),
      action: actionMap[req.body.status],
      description: `Tenant ${tenant.name} (${tenant.email}) status changed to ${req.body.status}.`,
      resource: { type: "tenant", id: String(tenant._id), name: tenant.name },
    });

    return res.json({ message: "Tenant status updated.", tenant: formatTenant(tenant.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Edit Tenant ───────────────────────────────────────────────
router.patch("/:tenantId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.tenantId))
      return res.status(400).json({ message: "Invalid tenant ID." });

    const { name, email, phone, businessName, businessAddress, businessPhone, businessDescription, plan } = req.body ?? {};
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (phone !== undefined) update.phone = phone;

    if (businessName !== undefined) update["business.name"] = businessName;
    if (businessAddress !== undefined) update["business.address"] = businessAddress;
    if (businessPhone !== undefined) update["business.phone"] = businessPhone;
    if (businessDescription !== undefined) update["business.description"] = businessDescription;

    if (plan && ["starter", "growth", "pro"].includes(plan)) update.plan = plan;

    const tenant = await User.findOneAndUpdate(
      { _id: req.params.tenantId, role: "tenant" },
      { $set: update },
      { new: true },
    ).select("-passwordHash -emailVerification -passwordReset -phoneVerification");

    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "tenant_updated",
      description: `Tenant ${tenant.name} details updated by admin.`,
      resource: { type: "tenant", id: String(tenant._id), name: tenant.name },
    });

    return res.json({ message: "Tenant updated successfully.", tenant: formatTenant(tenant.toObject()) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email is already in use." });
    }
    return next(error);
  }
});

// ── Impersonate Tenant ────────────────────────────────────────
router.post("/:tenantId/impersonate", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.tenantId))
      return res.status(400).json({ message: "Invalid tenant ID." });

    const tenant = await User.findOne({ _id: req.params.tenantId, role: "tenant" });
    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    const token = jwt.sign(
      { sub: tenant.id, email: tenant.email, role: tenant.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h", issuer: "webmintra" },
    );

    res.cookie("webmintra_session", token, sessionCookieOptions());

    await logActivity({
      ...buildLogContext(req),
      action: "tenant_impersonated",
      description: `Admin impersonated tenant ${tenant.name}.`,
      resource: { type: "tenant", id: String(tenant._id), name: tenant.name },
    });

    return res.json({ message: `Impersonating ${tenant.name}...` });
  } catch (error) {
    return next(error);
  }
});

// ── Assign Plan / Limits to Tenant ───────────────────────────
router.patch("/:tenantId/limits", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.tenantId))
      return res.status(400).json({ message: "Invalid tenant ID." });

    const { plan, limits } = req.body ?? {};

    const update = {};
    if (plan && ["starter", "growth", "pro"].includes(plan)) update.plan = plan;

    const tenant = await User.findOneAndUpdate(
      { _id: req.params.tenantId, role: "tenant" },
      { $set: update },
      { new: true },
    ).select("-passwordHash -emailVerification -passwordReset -phoneVerification");

    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    // If limits provided, update subscription limits
    if (limits && typeof limits === "object") {
      await Subscription.findOneAndUpdate(
        { tenant: req.params.tenantId },
        { $set: { limits } },
        { sort: { createdAt: -1 } },
      );
    }

    await logActivity({
      ...buildLogContext(req),
      action: "subscription_updated",
      description: `Plan/limits updated for tenant ${tenant.name}.`,
      resource: { type: "tenant", id: String(tenant._id), name: tenant.name },
    });

    return res.json({ message: "Tenant limits updated.", tenant: formatTenant(tenant.toObject()) });
  } catch (error) {
    return next(error);
  }
});

// ── Delete Tenant ─────────────────────────────────────────────
router.delete("/:tenantId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.tenantId))
      return res.status(400).json({ message: "Invalid tenant ID." });

    const tenant = await User.findOneAndDelete({ _id: req.params.tenantId, role: "tenant" });
    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    // Cascade: delete related websites, domains
    await Promise.all([
      Website.deleteMany({ owner: tenant._id }),
      Domain.deleteMany({ tenant: tenant._id }),
      Subscription.deleteMany({ tenant: tenant._id }),
    ]);

    await logActivity({
      ...buildLogContext(req),
      action: "tenant_deleted",
      description: `Tenant ${tenant.name} (${tenant.email}) permanently deleted.`,
      resource: { type: "tenant", id: String(tenant._id), name: tenant.name },
    });

    return res.json({ message: "Tenant deleted successfully." });
  } catch (error) {
    return next(error);
  }
});

// ── Tenant Analytics ──────────────────────────────────────────
router.get("/:tenantId/analytics", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.tenantId))
      return res.status(400).json({ message: "Invalid tenant ID." });

    const tenant = await User.findOne({ _id: req.params.tenantId, role: "tenant" }).lean();
    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    const [totalPayments, totalRevenue, websiteCount, domainCount] = await Promise.all([
      Payment.countDocuments({ tenant: tenant._id, status: "succeeded" }),
      Payment.aggregate([
        { $match: { tenant: new mongoose.Types.ObjectId(tenant._id), status: "succeeded" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Website.countDocuments({ owner: tenant._id }),
      Domain.countDocuments({ tenant: tenant._id }),
    ]);

    return res.json({
      analytics: {
        totalPayments,
        totalRevenue: totalRevenue[0]?.total ?? 0,
        websiteCount,
        domainCount,
        memberSince: tenant.createdAt,
        onboardingCompleted: Boolean(tenant.onboardingCompletedAt),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Bulk Actions ──────────────────────────────────────────────
router.post("/bulk", async (req, res, next) => {
  try {
    const { action, tenantIds } = req.body ?? {};
    if (!Array.isArray(tenantIds) || tenantIds.length === 0 || tenantIds.length > 100)
      return res.status(400).json({ message: "Provide 1–100 tenant IDs." });
    if (!tenantIds.every(isMongoId))
      return res.status(400).json({ message: "Invalid tenant IDs." });

    const validActions = ["suspend", "activate", "archive"];
    if (!validActions.includes(action))
      return res.status(400).json({ message: `Action must be one of: ${validActions.join(", ")}.` });

    const statusMap = { suspend: "suspended", activate: "active", archive: "archived" };
    const result = await User.updateMany(
      { _id: { $in: tenantIds }, role: "tenant" },
      { tenantStatus: statusMap[action] },
    );

    await logActivity({
      ...buildLogContext(req),
      action: "bulk_action",
      description: `Bulk ${action} applied to ${result.modifiedCount} tenants.`,
      metadata: { tenantIds, action, modifiedCount: result.modifiedCount },
    });

    return res.json({ message: `Bulk action applied to ${result.modifiedCount} tenants.`, modifiedCount: result.modifiedCount });
  } catch (error) {
    return next(error);
  }
});

// ── Helpers ───────────────────────────────────────────────────

function formatTenant(t) {
  return {
    id: String(t._id),
    name: t.name,
    email: t.email,
    businessName: t.business?.name || "",
    businessEmail: t.business?.email || "",
    businessPhone: t.business?.phone || "",
    businessAddress: t.business?.address || "",
    businessDescription: t.business?.description || "",
    logoUrl: t.business?.logoUrl || "",
    plan: t.plan,
    status: t.tenantStatus,
    isEmailVerified: t.isEmailVerified,
    onboardingCompleted: Boolean(t.onboardingCompletedAt),
    onboardingCompletedAt: t.onboardingCompletedAt,
    invitationId: t.invitationId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function formatSubscription(s) {
  return {
    id: s._id,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    trialEndsAt: s.trialEndsAt,
    autoRenew: s.autoRenew,
    plan: s.plan ? { id: s.plan._id, name: s.plan.name, interval: s.plan.interval, price: s.plan.price } : null,
  };
}

function formatPayment(p) {
  return {
    id: p._id,
    invoiceNumber: p.invoiceNumber,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    method: p.method,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };
}

function buildOnboardingStages(tenant, invitation, websites) {
  return [
    { stage: "invitation_sent", label: "Invitation Sent", completed: Boolean(invitation) },
    { stage: "invitation_accepted", label: "Invitation Accepted", completed: invitation?.status === "accepted" },
    { stage: "email_verified", label: "Email Verified", completed: tenant.isEmailVerified },
    { stage: "phone_verified", label: "Phone Verified", completed: tenant.isPhoneVerified },
    { stage: "business_profile", label: "Business Profile", completed: Boolean(tenant.business?.name) },
    { stage: "website_created", label: "Website Created", completed: websites.length > 0 },
    { stage: "onboarding_completed", label: "Onboarding Completed", completed: Boolean(tenant.onboardingCompletedAt) },
  ];
}

export default router;
