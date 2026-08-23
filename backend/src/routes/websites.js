import { Router } from "express";
import mongoose from "mongoose";
import { establishTenantContext, requireAuthenticatedUser, requireRole } from "../middleware/auth.js";
import { Website } from "../models/Website.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { StorageItem } from "../models/StorageItem.js";
import { Template } from "../models/Template.js";
import { ownedWebsiteScope, tenantScope } from "../lib/tenant-scope.js";
import { resolveTenantSeoEntitlements, sanitizeDraftSeo } from "../lib/tenant-seo-entitlements.js";
import multer from "multer";
import { imagekit } from "../lib/imagekit.js";
import { checkStorageLimit } from "../services/limits.js";
import { compressUploadedImages } from "../middleware/imageCompressor.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function websiteResponse(website) {
  return {
    id: website.id || website._id?.toString(),
    name: website.name,
    templateName: website.templateName,
    templateId: website.templateId,
    status: website.status,
    lastOpenedAt: website.lastOpenedAt,
    createdAt: website.createdAt,
    updatedAt: website.updatedAt,
    draftState: website.draftState,
    publishedState: website.publishedState,
  };
}

function validWebsiteId(id) {
  return mongoose.isObjectIdOrHexString(id);
}

router.use(requireAuthenticatedUser, requireRole("tenant"), establishTenantContext);

import { Domain } from "../models/Domain.js";

router.get("/", async (request, response, next) => {
  try {
    const websites = await Website.find(tenantScope(request.user, "owner"))
      .sort({ updatedAt: -1 })
      .lean();

    // Fetch active custom domains for this tenant
    const domains = await Domain.find({ ...tenantScope(request.user), status: "active" }).lean();
    const domainMap = {};
    domains.forEach(d => {
      if (d.website) domainMap[d.website.toString()] = d.domain;
    });

    return response.json({
      websites: websites.map(w => ({
        ...websiteResponse(w),
        customDomain: domainMap[w._id.toString()] || null
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    if (!request.user.onboardingCompletedAt)
      return response.status(403).json({ message: "Complete onboarding before creating a website." });

    const entitlements = await resolveTenantSeoEntitlements(request.user);
    if (entitlements.limits.websites > 0) {
      const count = await Website.countDocuments(tenantScope(request.user, "owner"));
      if (count >= entitlements.limits.websites) {
        return response.status(403).json({ message: `You have reached the maximum of ${entitlements.limits.websites} websites allowed on your plan. Please upgrade to create more.` });
      }
    }

    const templateId = request.body?.templateId;
    if (typeof templateId !== "string" || !mongoose.isObjectIdOrHexString(templateId)) {
      return response.status(400).json({ message: "Select a valid template." });
    }

    const template = await Template.findOne({ _id: templateId, isActive: true })
      .select("title")
      .lean();
    if (!template) return response.status(404).json({ message: "Template not found." });

    const name = request.user.business?.name || template.title;
    if (typeof name !== "string" || !name.trim() || name.length > 120) {
      return response.status(400).json({ message: "Provide a valid website name." });
    }

    const website = await Website.create({
      owner: request.user._id,
      name: name.trim(),
      templateId: template._id,
      templateName: template.title,
    });
    return response.status(201).json({ website: websiteResponse(website) });
  } catch (error) {
    return next(error);
  }
});

router.get("/:websiteId", async (request, response, next) => {
  try {
    if (!validWebsiteId(request.params.websiteId))
      return response.status(404).json({ message: "Website not found." });

    const website = await Website.findOne(ownedWebsiteScope(request.user, request.params.websiteId))
      .populate("templateId", "htmlContent pages");

    if (!website) return response.status(404).json({ message: "Website not found." });

    const htmlContent = website.templateId?.htmlContent || "";
    const pages = website.templateId?.pages || [];

    const entitlements = await resolveTenantSeoEntitlements(request.user);
    return response.json({
      website: websiteResponse(website),
      htmlContent,
      pages,
      seoEntitlements: entitlements,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:websiteId/forms", async (request, response, next) => {
  try {
    const scope = ownedWebsiteScope(request.user, request.params.websiteId);
    if (!scope) return response.status(404).json({ message: "Website not found." });

    const website = await Website.exists(scope);
    if (!website) return response.status(404).json({ message: "Website not found." });

    const forms = await FormSubmission.find({
      websiteId: request.params.websiteId,
      ...tenantScope(request.user, "tenantId"),
    })
      .sort({ createdAt: -1 })
      .lean();

    return response.json({ forms });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:websiteId/forms/:submissionId", async (request, response, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(request.params.submissionId)) {
      return response.status(404).json({ message: "Form submission not found." });
    }

    const scope = ownedWebsiteScope(request.user, request.params.websiteId);
    if (!scope) return response.status(404).json({ message: "Website not found." });

    const website = await Website.exists(scope);
    if (!website) return response.status(404).json({ message: "Website not found." });

    const submission = await FormSubmission.findOneAndDelete({
      _id: request.params.submissionId,
      websiteId: request.params.websiteId,
      ...tenantScope(request.user, "tenantId"),
    });

    if (!submission) {
      return response.status(404).json({ message: "Form submission not found." });
    }

    return response.json({ message: "Form submission deleted successfully." });
  } catch (error) {
    return next(error);
  }
});

router.post("/:websiteId/open", async (request, response, next) => {
  try {
    if (!validWebsiteId(request.params.websiteId))
      return response.status(404).json({ message: "Website not found." });

    const website = await Website.findOneAndUpdate(
      { ...ownedWebsiteScope(request.user, request.params.websiteId), status: { $ne: "archived" } },
      { lastOpenedAt: new Date() },
      { new: true },
    );
    if (!website) return response.status(404).json({ message: "Website not found." });
    return response.json({ website: websiteResponse(website) });
  } catch (error) {
    return next(error);
  }
});

router.post("/:websiteId/archive", async (request, response, next) => {
  try {
    if (!validWebsiteId(request.params.websiteId))
      return response.status(404).json({ message: "Website not found." });

    const website = await Website.findOneAndUpdate(
      { ...ownedWebsiteScope(request.user, request.params.websiteId), status: { $ne: "archived" } },
      { status: "archived" },
      { new: true },
    );
    if (!website) return response.status(404).json({ message: "Website not found." });
    return response.json({ website: websiteResponse(website) });
  } catch (error) {
    return next(error);
  }
});

router.put("/:websiteId/draft", async (request, response, next) => {
  try {
    if (!validWebsiteId(request.params.websiteId))
      return response.status(404).json({ message: "Website not found." });

    const { draftState } = request.body;
    if (!draftState) return response.status(400).json({ message: "Draft state is required." });
    
    const entitlements = await resolveTenantSeoEntitlements(request.user);
    
    if (entitlements.limits.pagesPerWebsite > 0 && draftState.pages && Array.isArray(draftState.pages)) {
        if (draftState.pages.length > entitlements.limits.pagesPerWebsite) {
            return response.status(403).json({ message: `You have reached the maximum of ${entitlements.limits.pagesPerWebsite} pages allowed per website on your plan. Please upgrade to add more.` });
        }
    }

    const sanitizedDraftState = sanitizeDraftSeo(draftState, entitlements.seoFeatures);

    const website = await Website.findOneAndUpdate(
      ownedWebsiteScope(request.user, request.params.websiteId),
      { $set: { draftState: sanitizedDraftState } },
      { new: true },
    );
    if (!website) return response.status(404).json({ message: "Website not found." });
    return response.json({ website: websiteResponse(website), seoEntitlements: entitlements });
  } catch (error) {
    return next(error);
  }
});

router.post("/:websiteId/publish", async (request, response, next) => {
  try {
    if (!validWebsiteId(request.params.websiteId))
      return response.status(404).json({ message: "Website not found." });

    const website = await Website.findOne(ownedWebsiteScope(request.user, request.params.websiteId));
    if (!website) return response.status(404).json({ message: "Website not found." });

    const entitlements = await resolveTenantSeoEntitlements(request.user);
    const sanitizedDraftState = sanitizeDraftSeo(
      website.draftState,
      entitlements.seoFeatures,
    );
    website.draftState = sanitizedDraftState;
    website.publishedState = sanitizedDraftState;
    website.status = "published";
    website.markModified("draftState");
    website.markModified("publishedState");
    await website.save();

    return response.json({
      website: websiteResponse(website),
      seoEntitlements: entitlements,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:websiteId/assets", async (req, res, next) => {
  try {
    const websiteScope = ownedWebsiteScope(req.user, req.params.websiteId);
    if (!websiteScope || !(await Website.exists(websiteScope))) {
      return res.status(404).json({ message: "Website not found." });
    }

    const assets = await StorageItem.find({
      ...tenantScope(req.user),
      website: req.params.websiteId,
    }).sort({ createdAt: -1 }).lean();

    return res.json({ assets });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:websiteId/assets/:assetId", async (req, res, next) => {
  try {
    const websiteScope = ownedWebsiteScope(req.user, req.params.websiteId);
    if (!websiteScope || !mongoose.isObjectIdOrHexString(req.params.assetId)) {
      return res.status(404).json({ message: "Asset not found." });
    }
    if (!(await Website.exists(websiteScope))) {
      return res.status(404).json({ message: "Asset not found." });
    }

    const asset = await StorageItem.findOneAndDelete({
      _id: req.params.assetId,
      ...tenantScope(req.user),
      website: req.params.websiteId,
    });
    if (!asset) return res.status(404).json({ message: "Asset not found." });

    const providerFileId = asset.metadata?.providerFileId;
    if (providerFileId) await imagekit.deleteFile(providerFileId);

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post("/:websiteId/upload", upload.single("file"), compressUploadedImages("standard"), async (req, res, next) => {
  try {
    if (!validWebsiteId(req.params.websiteId))
      return res.status(404).json({ message: "Website not found." });

    const website = await Website.findOne(ownedWebsiteScope(req.user, req.params.websiteId));
    if (!website) return res.status(404).json({ message: "Website not found." });

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const entitlements = await resolveTenantSeoEntitlements(req.user);
    const isAllowed = await checkStorageLimit(req.user._id, req.file.size, entitlements.limits);
    if (!isAllowed) {
        return res.status(403).json({ message: `You have exceeded your plan's storage limit of ${entitlements.limits.storageMb}MB. Please upgrade your plan or delete some files.` });
    }

    const uploadResponse = await imagekit.upload({
      file: req.file.buffer.toString("base64"),
      fileName: req.file.originalname || `upload_${Date.now()}`,
      folder: `/webmintra/tenants/${req.user.id}/websites/${website.id}`,
      tags: [`tenant:${req.user.id}`, `website:${website.id}`],
    });

    await StorageItem.create({
      tenant: req.user._id,
      website: website._id,
      filename: uploadResponse.name || req.file.originalname,
      originalName: req.file.originalname || "",
      mimeType: req.file.mimetype || "",
      mediaType: req.file.mimetype?.startsWith("image/") ? "image" : "other",
      size: uploadResponse.size ?? req.file.size,
      url: uploadResponse.url,
      path: uploadResponse.filePath || "",
      bucket: "imagekit",
      uploadedBy: req.user._id,
      metadata: { providerFileId: uploadResponse.fileId },
    });

    res.status(200).json({
      message: "File uploaded successfully",
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
