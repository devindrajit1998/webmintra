import { Router } from "express";
import multer from "multer";
import { User } from "../models/User.js";
import { imagekit } from "../lib/imagekit.js";
import { requireAuthenticatedUser, requireRole } from "../middleware/auth.js";

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
    if (!request.file) return response.status(400).json({ message: "Select a supported image up to 2 MB." });
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

export default router;
