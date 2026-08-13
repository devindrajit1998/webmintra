/**
 * Reports & Analytics Routes
 * /api/admin/reports
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { User } from "../../models/User.js";
import { Website } from "../../models/Website.js";
import { Payment } from "../../models/Payment.js";
import { Subscription } from "../../models/Subscription.js";
import { SupportTicket } from "../../models/SupportTicket.js";
import { Domain } from "../../models/Domain.js";
import { StorageItem } from "../../models/StorageItem.js";
import { Invitation } from "../../models/Invitation.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── Overview Report ───────────────────────────────────────────
router.get("/overview", async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalTenants, activeTenants, newTenantsThisMonth, newTenantsPrevMonth,
      totalWebsites, totalRevenue, revenueThisMonth, revenuePrevMonth,
      openTickets, activeSubscriptions, totalDomains,
    ] = await Promise.all([
      User.countDocuments({ role: "tenant" }),
      User.countDocuments({ role: "tenant", tenantStatus: "active" }),
      User.countDocuments({ role: "tenant", createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ role: "tenant", createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } }),
      Website.countDocuments(),
      Payment.aggregate([{ $match: { status: "succeeded" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "succeeded", paidAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "succeeded", paidAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      SupportTicket.countDocuments({ status: "open" }),
      Subscription.countDocuments({ status: "active" }),
      Domain.countDocuments(),
    ]);

    const tenantGrowthRate = newTenantsPrevMonth > 0
      ? ((newTenantsThisMonth - newTenantsPrevMonth) / newTenantsPrevMonth * 100).toFixed(1)
      : null;

    const revenueGrowthRate = revenuePrevMonth[0]?.total > 0
      ? (((revenueThisMonth[0]?.total ?? 0) - revenuePrevMonth[0].total) / revenuePrevMonth[0].total * 100).toFixed(1)
      : null;

    return res.json({
      overview: {
        tenants: { total: totalTenants, active: activeTenants, newThisMonth: newTenantsThisMonth, growthRate: tenantGrowthRate },
        revenue: { total: totalRevenue[0]?.total ?? 0, thisMonth: revenueThisMonth[0]?.total ?? 0, growthRate: revenueGrowthRate },
        websites: { total: totalWebsites },
        subscriptions: { active: activeSubscriptions },
        support: { openTickets },
        domains: { total: totalDomains },
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Revenue Report ────────────────────────────────────────────
router.get("/revenue", async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const from = new Date();
    from.setMonth(from.getMonth() - months);

    const monthly = await Payment.aggregate([
      { $match: { status: "succeeded", paidAt: { $gte: from } } },
      {
        $group: {
          _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
          revenue: { $sum: "$amount" },
          transactions: { $sum: 1 },
          avgTransaction: { $avg: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const byMethod = await Payment.aggregate([
      { $match: { status: "succeeded" } },
      { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    const topTenants = await Payment.aggregate([
      { $match: { status: "succeeded" } },
      { $group: { _id: "$tenant", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "tenant" } },
      { $unwind: "$tenant" },
      { $project: { total: 1, count: 1, "tenant.name": 1, "tenant.email": 1, "tenant.business.name": 1 } },
    ]);

    return res.json({
      monthly: monthly.map((m) => ({
        label: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
        revenue: m.revenue,
        transactions: m.transactions,
        avgTransaction: Math.round(m.avgTransaction * 100) / 100,
      })),
      byMethod,
      topTenants: topTenants.map((t) => ({
        id: t._id,
        tenantName: t.tenant.name,
        tenantEmail: t.tenant.email,
        businessName: t.tenant.business?.name,
        totalRevenue: t.total,
        transactionCount: t.count,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// ── Tenant Report ─────────────────────────────────────────────
router.get("/tenants", async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const from = new Date();
    from.setMonth(from.getMonth() - months);

    const [monthly, byStatus, byPlan, conversionFunnel] = await Promise.all([
      User.aggregate([
        { $match: { role: "tenant", createdAt: { $gte: from } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      User.aggregate([
        { $match: { role: "tenant" } },
        { $group: { _id: "$tenantStatus", count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { role: "tenant" } },
        { $group: { _id: "$plan", count: { $sum: 1 } } },
      ]),
      Promise.all([
        Invitation.countDocuments({ status: "pending" }),
        Invitation.countDocuments({ status: "accepted" }),
        User.countDocuments({ role: "tenant", isEmailVerified: true }),
        User.countDocuments({ role: "tenant", onboardingCompletedAt: { $exists: true } }),
      ]),
    ]);

    const [invited, accepted, verified, onboarded] = conversionFunnel;

    return res.json({
      monthly: monthly.map((m) => ({
        label: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
        count: m.count,
      })),
      byStatus,
      byPlan,
      conversionFunnel: { invited, accepted, verified, onboarded },
    });
  } catch (error) {
    return next(error);
  }
});

// ── Storage Report ────────────────────────────────────────────
router.get("/storage", async (req, res, next) => {
  try {
    const [total, byType, topTenants] = await Promise.all([
      StorageItem.aggregate([{ $group: { _id: null, totalBytes: { $sum: "$size" }, count: { $sum: 1 } } }]),
      StorageItem.aggregate([
        { $group: { _id: "$mediaType", totalBytes: { $sum: "$size" }, count: { $sum: 1 } } },
      ]),
      StorageItem.aggregate([
        { $group: { _id: "$tenant", totalBytes: { $sum: "$size" }, count: { $sum: 1 } } },
        { $sort: { totalBytes: -1 } },
        { $limit: 10 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "tenant" } },
        { $unwind: { path: "$tenant", preserveNullAndEmpty: true } },
        { $project: { totalBytes: 1, count: 1, "tenant.name": 1, "tenant.email": 1 } },
      ]),
    ]);

    return res.json({
      total: {
        bytes: total[0]?.totalBytes ?? 0,
        mb: Math.round((total[0]?.totalBytes ?? 0) / (1024 * 1024)),
        files: total[0]?.count ?? 0,
      },
      byType,
      topTenants: topTenants.map((t) => ({
        id: t._id,
        tenantName: t.tenant?.name,
        bytes: t.totalBytes,
        mb: Math.round(t.totalBytes / (1024 * 1024)),
        fileCount: t.count,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// ── Support Report ────────────────────────────────────────────
router.get("/support", async (req, res, next) => {
  try {
    const [byStatus, byPriority, avgResponseTime] = await Promise.all([
      SupportTicket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      SupportTicket.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
      SupportTicket.aggregate([
        { $match: { firstResponseAt: { $exists: true } } },
        { $project: { responseTimeMs: { $subtract: ["$firstResponseAt", "$createdAt"] } } },
        { $group: { _id: null, avgMs: { $avg: "$responseTimeMs" } } },
      ]),
    ]);

    return res.json({
      byStatus,
      byPriority,
      avgFirstResponseHours: avgResponseTime[0] ? Math.round(avgResponseTime[0].avgMs / 3600000 * 10) / 10 : null,
    });
  } catch (error) {
    return next(error);
  }
});

// ── Subscription Report ───────────────────────────────────────
router.get("/subscriptions", async (req, res, next) => {
  try {
    const [byStatus, churnedThisMonth, newThisMonth] = await Promise.all([
      Subscription.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Subscription.countDocuments({ status: "cancelled", cancelledAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }),
      Subscription.countDocuments({ createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }),
    ]);

    return res.json({ byStatus, churnedThisMonth, newThisMonth });
  } catch (error) {
    return next(error);
  }
});

export default router;
