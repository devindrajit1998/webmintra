/**
 * Admin Dashboard Route
 * GET /api/admin/dashboard
 * 
 * Returns comprehensive platform metrics including revenue, tenant stats,
 * website counts, recent activity, and system health indicators.
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { User } from "../../models/User.js";
import { Website } from "../../models/Website.js";
import { Invitation } from "../../models/Invitation.js";
import { Subscription } from "../../models/Subscription.js";
import { Payment } from "../../models/Payment.js";
import { SupportTicket } from "../../models/SupportTicket.js";
import { ActivityLog } from "../../models/ActivityLog.js";
import { Domain } from "../../models/Domain.js";
import { StorageItem } from "../../models/StorageItem.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

router.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      // Tenant metrics
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      archivedTenants,
      newTenantsThisMonth,
      // Website metrics
      totalWebsites,
      draftWebsites,
      // Invitation metrics
      pendingInvitations,
      // Payment metrics
      mrr,
      arrPayments,
      revenueThisMonth,
      recentPayments,
      // Ticket metrics
      openTickets,
      // Subscriptions
      activeSubscriptions,
      // Activity
      recentActivity,
      // Domains
      totalDomains,
      activeDomains,
      // Storage
      storageResult,
      // Recent tenants
      recentTenants,
    ] = await Promise.all([
      User.countDocuments({ role: "tenant" }),
      User.countDocuments({ role: "tenant", tenantStatus: "active" }),
      User.countDocuments({ role: "tenant", tenantStatus: "suspended" }),
      Subscription.countDocuments({ status: "trialing" }),
      User.countDocuments({ role: "tenant", tenantStatus: "archived" }),
      User.countDocuments({ role: "tenant", createdAt: { $gte: startOfMonth } }),
      Website.countDocuments(),
      Website.countDocuments({ status: "draft" }),
      Invitation.countDocuments({ status: "pending" }),
      // MRR: sum of active monthly subscriptions
      Payment.aggregate([
        { $match: { status: "succeeded", paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // ARR: sum of all payments this year
      Payment.aggregate([
        { $match: { status: "succeeded", paidAt: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Revenue this month
      Payment.aggregate([
        { $match: { status: "succeeded", paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Recent payments
      Payment.find({ status: "succeeded" })
        .sort({ paidAt: -1 })
        .limit(5)
        .populate("tenant", "name email business")
        .lean(),
      SupportTicket.countDocuments({ status: "open" }),
      Subscription.countDocuments({ status: "active" }),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Domain.countDocuments(),
      Domain.countDocuments({ status: "active" }),
      // Storage: total bytes used
      StorageItem.aggregate([
        { $group: { _id: null, totalBytes: { $sum: "$size" } } },
      ]),
      User.find({ role: "tenant" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email business plan tenantStatus createdAt")
        .lean(),
    ]);

    // Revenue trend (last 6 months)
    const revenueTrend = await Payment.aggregate([
      { $match: { status: "succeeded", paidAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      {
        $group: {
          _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Tenant growth (last 6 months)
    const tenantGrowth = await User.aggregate([
      { $match: { role: "tenant", createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.json({
      metrics: {
        revenue: {
          mrr: mrr[0]?.total ?? 0,
          arr: arrPayments[0]?.total ?? 0,
          thisMonth: revenueThisMonth[0]?.total ?? 0,
          currency: "INR",
        },
        tenants: {
          total: totalTenants,
          active: activeTenants,
          suspended: suspendedTenants,
          trial: trialTenants,
          archived: archivedTenants,
          newThisMonth: newTenantsThisMonth,
          pendingInvitations,
        },
        websites: {
          total: totalWebsites,
          draft: draftWebsites,
          published: totalWebsites - draftWebsites,
        },
        subscriptions: {
          active: activeSubscriptions,
        },
        support: {
          openTickets,
        },
        domains: {
          total: totalDomains,
          active: activeDomains,
        },
        storage: {
          totalBytes: storageResult[0]?.totalBytes ?? 0,
          totalMb: Math.round((storageResult[0]?.totalBytes ?? 0) / (1024 * 1024)),
        },
      },
      recentActivity: recentActivity.map((log) => ({
        id: log._id,
        action: log.action,
        description: log.description,
        actorName: log.actorName,
        resource: log.resource,
        createdAt: log.createdAt,
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p._id,
        invoiceNumber: p.invoiceNumber,
        amount: p.amount,
        currency: p.currency,
        tenant: {
          name: p.tenant?.name,
          email: p.tenant?.email,
          businessName: p.tenant?.business?.name,
        },
        paidAt: p.paidAt,
      })),
      recentTenants: recentTenants.map((t) => ({
        id: t._id,
        name: t.name,
        email: t.email,
        businessName: t.business?.name || "Pending setup",
        plan: t.plan,
        status: t.tenantStatus,
        createdAt: t.createdAt,
      })),
      charts: {
        revenueTrend: revenueTrend.map((r) => ({
          label: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
          revenue: r.total,
          transactions: r.count,
        })),
        tenantGrowth: tenantGrowth.map((t) => ({
          label: `${t._id.year}-${String(t._id.month).padStart(2, "0")}`,
          tenants: t.count,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
