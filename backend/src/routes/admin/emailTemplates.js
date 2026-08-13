/**
 * Email Template Management Routes
 * /api/admin/email-templates
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { EmailTemplate, EMAIL_TEMPLATE_TYPES } from "../../models/EmailTemplate.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";
import { isMongoId, isString, isEnum, stripUndefined } from "../../lib/validate.js";
import { sendRawEmail } from "../../services/mail.js";
import multer from "multer";
import { imagekit } from "../../lib/imagekit.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuthenticatedUser, requireRole("admin"));

router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type && EMAIL_TEMPLATE_TYPES.includes(req.query.type)) filter.type = req.query.type;
    if (req.query.isActive === "true") filter.isActive = true;
    const templates = await EmailTemplate.find(filter)
      .sort({ type: 1, isDefault: -1 })
      .populate("createdBy", "name email")
      .lean();
    return res.json({ templates, types: EMAIL_TEMPLATE_TYPES });
  } catch (error) {
    return next(error);
  }
});

router.get("/:templateId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.templateId)) return res.status(400).json({ message: "Invalid ID." });
    const template = await EmailTemplate.findById(req.params.templateId).lean();
    if (!template) return res.status(404).json({ message: "Template not found." });
    return res.json({ template });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const errors = [];
    if (!isString(b.name, { max: 120 })) errors.push("name is required.");
    if (!isEnum(b.type, EMAIL_TEMPLATE_TYPES)) errors.push(`type must be one of: ${EMAIL_TEMPLATE_TYPES.join(", ")}.`);
    if (!isString(b.subject, { max: 200 })) errors.push("subject is required.");
    if (!isString(b.htmlBody, { min: 1, max: 1000000 })) errors.push("htmlBody is required.");
    if (errors.length) return res.status(400).json({ message: errors.join(" "), errors });

    const template = await EmailTemplate.create({
      name: b.name.trim(), type: b.type, category: b.category,
      subject: b.subject.trim(), htmlBody: b.htmlBody,
      textBody: b.textBody?.trim() || "",
      previewText: b.previewText?.trim() || "",
      variables: Array.isArray(b.variables) ? b.variables : [],
      isDefault: b.isDefault ?? false,
      isActive: b.isActive ?? true,
      createdBy: req.user._id,
    });

    return res.status(201).json({ template });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:templateId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.templateId)) return res.status(400).json({ message: "Invalid ID." });
    const b = req.body ?? {};
    const update = stripUndefined({
      name: b.name?.trim(), type: b.type, category: b.category,
      subject: b.subject?.trim(), htmlBody: b.htmlBody,
      textBody: b.textBody?.trim(), previewText: b.previewText?.trim(),
      variables: b.variables, isDefault: b.isDefault, isActive: b.isActive,
      updatedBy: req.user._id,
    });

    const template = await EmailTemplate.findByIdAndUpdate(req.params.templateId, { $set: update }, { new: true });
    if (!template) return res.status(404).json({ message: "Template not found." });
    return res.json({ template });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:templateId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.templateId)) return res.status(400).json({ message: "Invalid ID." });
    await EmailTemplate.findByIdAndDelete(req.params.templateId);
    return res.json({ message: "Template deleted." });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:templateId/set-default", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.templateId)) return res.status(400).json({ message: "Invalid ID." });
    
    const template = await EmailTemplate.findById(req.params.templateId);
    if (!template) return res.status(404).json({ message: "Template not found." });

    // Unset default for all others of this type
    await EmailTemplate.updateMany({ type: template.type }, { $set: { isDefault: false } });
    
    // Set this as default
    template.isDefault = true;
    await template.save();

    return res.json({ message: "Default template updated.", template });
  } catch (error) {
    return next(error);
  }
});

router.get("/:templateId/variables", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.templateId)) return res.status(400).json({ message: "Invalid ID." });
    
    const template = await EmailTemplate.findById(req.params.templateId).lean();
    if (!template) return res.status(404).json({ message: "Template not found." });

    // In a real app we might dynamically pull variables based on type, 
    // but we can return what's saved on the model plus globals.
    const globals = [
      { key: "appName", description: "Name of the application" },
      { key: "year", description: "Current year" },
      { key: "supportEmail", description: "Support email address" },
      { key: "dashboardUrl", description: "URL to the dashboard" }
    ];

    const typeVariablesMap = {
      otp: [
        { key: "name", description: "User's name" },
        { key: "code", description: "The OTP code" },
        { key: "action", description: "Action being verified (e.g. reset password)" },
        { key: "purpose", description: "Purpose of OTP" }
      ],
      welcome: [{ key: "name", description: "User's name" }],
      invitation: [
        { key: "ownerName", description: "Name of person inviting" },
        { key: "businessName", description: "Business name" },
        { key: "invitationUrl", description: "Link to accept invite" }
      ]
    };

    const typeVars = typeVariablesMap[template.type] || [];
    
    const allVars = [
      ...globals.map(v => v.key),
      ...typeVars.map(v => v.key),
      ...(template.variables || []).map((v) => v.key)
    ];

    return res.json({ variables: [...new Set(allVars)] });
  } catch (error) {
    return next(error);
  }
});

// ── Image Upload ──────────────────────────────────────────────
router.post("/upload-image", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image file provided." });
    
    // Check file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Image must be less than 5MB." });
    }

    const uploadResponse = await imagekit.upload({
      file: req.file.buffer,
      fileName: `email_${Date.now()}_${req.file.originalname}`,
      folder: "/email-assets"
    });

    return res.json({ url: uploadResponse.url });
  } catch (error) {
    return next(error);
  }
});

// ── Preview / Test Send ───────────────────────────────────────
router.post("/:templateId/preview", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.templateId)) return res.status(400).json({ message: "Invalid ID." });

    const template = await EmailTemplate.findById(req.params.templateId).lean();
    if (!template) return res.status(404).json({ message: "Template not found." });

    const testVars = req.body?.variables ?? {};
    const interpolate = (str) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => testVars[k] ?? `[${k}]`);

    return res.json({
      subject: interpolate(template.subject),
      htmlBody: interpolate(template.htmlBody),
      textBody: template.textBody ? interpolate(template.textBody) : "",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:templateId/send-test", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.templateId)) return res.status(400).json({ message: "Invalid ID." });

    const template = await EmailTemplate.findById(req.params.templateId).lean();
    if (!template) return res.status(404).json({ message: "Template not found." });

    const to = req.body?.to || req.user.email;
    if (!to || !/^\S+@\S+\.\S+$/.test(to))
      return res.status(400).json({ message: "Provide a valid recipient email." });

    const testVars = req.body?.variables ?? {};
    const interpolate = (str) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => testVars[k] ?? `[${k}]`);

    await sendRawEmail({
      to,
      subject: `[TEST] ${interpolate(template.subject)}`,
      html: interpolate(template.htmlBody),
      text: template.textBody ? interpolate(template.textBody) : undefined,
    });

    return res.json({ message: `Test email sent to ${to}.` });
  } catch (error) {
    return next(error);
  }
});

export default router;
