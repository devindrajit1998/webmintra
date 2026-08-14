import { Router } from "express";
import multer from "multer";
import { User } from "../models/User.js";
import { resolveTenantSeoEntitlements } from "../lib/tenant-seo-entitlements.js";
import { checkStorageLimit } from "../services/limits.js";
import { AccountDeletionRequest } from "../models/AccountDeletionRequest.js";
import { Notification } from "../models/Notification.js";
import { imagekit } from "../lib/imagekit.js";
import { requireAuthenticatedUser, requireRole } from "../middleware/auth.js";
import { logActivity, buildLogContext } from "../services/activityLog.js";

const router = Router();
const BRAND_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, BRAND_IMAGE_TYPES.has(file.mimetype)),
});
const BUSINESS_LIMITS = {
  name: 120,
  logoUrl: 2048,
  faviconUrl: 2048,
  address: 300,
  email: 254,
  phone: 20,
  description: 500,
};

export function formatBusiness(business = {}) {
  return Object.fromEntries(
    Object.keys(BUSINESS_LIMITS).map((field) => [field, business[field] || ""]),
  );
}

export function validateBusiness(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Provide valid business information." };
  }

  const business = {};
  for (const [field, maxLength] of Object.entries(BUSINESS_LIMITS)) {
    const raw = input[field];
    // Treat missing / null / undefined as empty string (all fields are optional except name)
    const value = raw == null ? "" : raw;
    if (typeof value !== "string" || value.trim().length > maxLength) {
      return { error: `Business ${field} must be text up to ${maxLength} characters.` };
    }
    business[field] = value.trim();
  }

  if (!business.name) return { error: "Business name is required." };
  if (business.email && !/^\S+@\S+\.\S+$/.test(business.email)) {
    return { error: "Provide a valid business email address." };
  }
  for (const [field, label] of [["logoUrl", "Logo"], ["faviconUrl", "Favicon"]]) {
    if (!business[field]) continue;
    try {
      const url = new URL(business[field]);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return { error: `${label} URL must be a valid HTTP or HTTPS address.` };
    }
  }

  return { business };
}

router.use(requireAuthenticatedUser);

router.get("/deletion-request", requireRole("tenant"), async (request, response, next) => {
  try {
    const deletionRequest = await AccountDeletionRequest.findOne({
      tenant: request.user._id,
      status: "pending",
    }).lean();

    return response.json({
      deletionRequest: deletionRequest ? formatDeletionRequest(deletionRequest) : null,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/deletion-request", requireRole("tenant"), async (request, response, next) => {
  try {
    const confirmation = request.body?.confirmation;
    const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
    if (confirmation !== "DELETE MY ACCOUNT") {
      return response.status(400).json({ message: "Enter DELETE MY ACCOUNT to confirm your request." });
    }
    if (reason.length > 1000) {
      return response.status(400).json({ message: "Reason must be 1000 characters or fewer." });
    }

    const existingRequest = await AccountDeletionRequest.findOne({
      tenant: request.user._id,
      status: "pending",
    });
    if (existingRequest) {
      return response.status(409).json({
        message: "An account deletion request is already pending.",
        deletionRequest: formatDeletionRequest(existingRequest),
      });
    }

    const deletionRequest = await AccountDeletionRequest.create({
      tenant: request.user._id,
      reason,
    });
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          recipient: admin._id,
          type: "tenant",
          title: "Account deletion requested",
          message: `${request.user.name} (${request.user.email}) requested account deletion.`,
          link: `/admin/tenants/${request.user._id}`,
          metadata: {
            tenantId: String(request.user._id),
            deletionRequestId: String(deletionRequest._id),
          },
        })),
      );
    }

    await logActivity({
      ...buildLogContext(request),
      action: "account_deletion_requested",
      description: `Tenant ${request.user.name} (${request.user.email}) requested account deletion.`,
      resource: { type: "tenant", id: String(request.user._id), name: request.user.name },
    });

    return response.status(201).json({
      message: "Your deletion request was submitted for admin review.",
      deletionRequest: formatDeletionRequest(deletionRequest),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ message: "An account deletion request is already pending." });
    }
    return next(error);
  }
});

router.delete("/deletion-request", requireRole("tenant"), async (request, response, next) => {
  try {
    const deletionRequest = await AccountDeletionRequest.findOneAndUpdate(
      { tenant: request.user._id, status: "pending" },
      { $set: { status: "cancelled", cancelledAt: new Date() } },
      { new: true },
    );
    if (!deletionRequest) {
      return response.status(404).json({ message: "No pending deletion request was found." });
    }

    await logActivity({
      ...buildLogContext(request),
      action: "account_deletion_cancelled",
      description: `Tenant ${request.user.name} (${request.user.email}) cancelled their account deletion request.`,
      resource: { type: "tenant", id: String(request.user._id), name: request.user.name },
    });

    return response.json({ message: "Your account deletion request was cancelled." });
  } catch (error) {
    return next(error);
  }
});

router.get("/business", requireRole("tenant"), (request, response) => {
  return response.json({ business: formatBusiness(request.user.business) });
});

router.put("/business", requireRole("tenant"), async (request, response, next) => {
  try {
    const result = validateBusiness(request.body?.business);
    if (result.error) return response.status(400).json({ message: result.error });

    request.user.business = result.business;
    await request.user.save();
    return response.json({
      message: "Business information updated.",
      business: formatBusiness(request.user.business),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/business/upload", requireRole("tenant"), upload.single("file"), async (request, response, next) => {
  try {
    if (!request.file) {
      return response.status(400).json({ message: "No file uploaded." });
    }

    const entitlements = await resolveTenantSeoEntitlements(request.user);
    const isAllowed = await checkStorageLimit(request.user._id, request.file.size, entitlements.limits);
    if (!isAllowed) {
        return response.status(403).json({ message: `You have exceeded your plan's storage limit of ${entitlements.limits.storageMb}MB. Please upgrade your plan or delete some files.` });
    }
    const assetType = request.body?.assetType === "favicon" ? "favicon" : "logo";
    const uploadResponse = await imagekit.upload({
      file: request.file.buffer.toString("base64"),
      fileName: `${assetType}-${Date.now()}-${request.file.originalname}`,
      folder: `/webmintra/tenants/${request.user.id}/branding`,
      tags: [`tenant:${request.user.id}`, `business-${assetType}`],
    });
    return response.status(201).json({ url: uploadResponse.url, fileId: uploadResponse.fileId });
  } catch (error) {
    return next(error);
  }
});

router.use(requireRole("admin"));

router.get("/", async (_request, response, next) => {
  try {
    const tenants = await User.find({ role: "tenant" }, { name: 1, email: 1, business: 1, plan: 1, tenantStatus: 1, onboardingCompletedAt: 1, createdAt: 1, updatedAt: 1 }).sort({ createdAt: -1 }).lean();
    return response.json({ tenants: tenants.map((tenant) => ({ id: String(tenant._id), businessName: tenant.business?.name || "Pending setup", ownerName: tenant.name, ownerEmail: tenant.email, plan: tenant.plan, status: tenant.tenantStatus, onboardingCompleted: Boolean(tenant.onboardingCompletedAt), createdAt: tenant.createdAt, updatedAt: tenant.updatedAt })) });
  } catch (error) { return next(error); }
});

router.post("/:tenantId/status", async (request, response, next) => {
  try {
    const status = request.body?.status;
    if (!["active", "suspended", "archived"].includes(status)) return response.status(400).json({ message: "Provide a valid tenant status." });
    const tenant = await User.findOneAndUpdate({ _id: request.params.tenantId, role: "tenant" }, { tenantStatus: status }, { new: true });
    if (!tenant) return response.status(404).json({ message: "Tenant not found." });
    return response.json({ message: "Tenant status updated." });
  } catch (error) { return next(error); }
});

function formatDeletionRequest(deletionRequest) {
  return {
    id: String(deletionRequest._id),
    status: deletionRequest.status,
    reason: deletionRequest.reason || "",
    requestedAt: deletionRequest.requestedAt,
    reviewedAt: deletionRequest.reviewedAt,
    adminNote: deletionRequest.adminNote || "",
  };
}

export default router;
