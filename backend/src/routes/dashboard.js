import { Router } from "express";
import { User } from "../models/User.js";
import { requireAuthenticatedUser, requireRole } from "../middleware/auth.js";
import { resolveTenantSeoEntitlements } from "../lib/tenant-seo-entitlements.js";

const router = Router();

router.use(requireAuthenticatedUser);

router.get("/admin", requireRole("admin"), async (_request, response, next) => {
  try {
    const [totalUsers, verifiedUsers, administrators, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isEmailVerified: true }),
      User.countDocuments({ role: "admin" }),
      User.find(
        { role: "tenant" },
        { name: 1, email: 1, role: 1, isEmailVerified: 1, createdAt: 1 },
      )
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return response.json({
      metrics: {
        totalUsers,
        verifiedUsers,
        tenantUsers: totalUsers - administrators,
        administrators,
      },
      recentUsers: recentUsers.map((user) => ({
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/tenant", requireRole("tenant"), async (request, response, next) => {
  try {
    const entitlements = await resolveTenantSeoEntitlements(request.user);
    const fallbackLimits = {
      starter: { websites: 1, storage: 1 },
      growth: { websites: 3, storage: 10 },
      pro: { websites: 10, storage: 50 },
    }[entitlements.planSlug] || { websites: 1, storage: 1 };
    const limits = {
      websites: entitlements.limits?.websites ?? fallbackLimits.websites,
      storage: entitlements.limits?.storageMb != null
        ? entitlements.limits.storageMb / 1024
        : fallbackLimits.storage,
    };

    return response.json({
      account: {
        name: request.user.name,
        email: request.user.email,
        role: request.user.role,
        memberSince: request.user.createdAt,
        plan: entitlements.planSlug,
        planName: entitlements.planName,
        limits,
        seoFeatures: entitlements.seoFeatures,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
