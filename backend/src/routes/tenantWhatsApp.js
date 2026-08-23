/**
 * Tenant Workspace WhatsApp Routes
 * /api/workspace/whatsapp
 *
 * Fully isolated endpoints where tenantId is strictly derived from req.tenantId (JWT).
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole, establishTenantContext } from "../middleware/auth.js";
import { tenantWhatsAppManager } from "../services/TenantWhatsAppManager.js";
import { TenantWhatsAppSettings } from "../models/TenantWhatsAppSettings.js";
import { WhatsAppMessageJob } from "../models/WhatsAppMessageJob.js";
import { WhatsAppCampaign } from "../models/WhatsAppCampaign.js";
import { whatsAppQueueService } from "../services/WhatsAppQueueService.js";
import { whatsAppCampaignService } from "../services/WhatsAppCampaignService.js";
import { previewTemplate } from "../services/WhatsAppTemplateService.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { isValidPhoneNumber } from "../lib/phone.js";

const router = Router();

// Strict tenant authorization on every request
router.use(requireAuthenticatedUser, requireRole("tenant"), establishTenantContext);

/**
 * GET /api/workspace/whatsapp/status
 * Returns live pairing status, QR DataURL, and connected device info.
 */
router.get("/status", async (req, res, next) => {
  try {
    const status = await tenantWhatsAppManager.getTenantStatus(req.tenantId);
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/workspace/whatsapp/connect
 * Starts Baileys socket session and generates QR code.
 */
router.post("/connect", async (req, res, next) => {
  try {
    const status = await tenantWhatsAppManager.initTenantSession(req.tenantId);
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/workspace/whatsapp/reconnect
 * Resets socket and forces a fresh QR code generation.
 */
router.post("/reconnect", async (req, res, next) => {
  try {
    const status = await tenantWhatsAppManager.reconnectTenantSession(req.tenantId);
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/workspace/whatsapp/logout
 * Unlinks the device and destroys the local auth session directory.
 */
router.post("/logout", async (req, res, next) => {
  try {
    const result = await tenantWhatsAppManager.logoutTenantSession(req.tenantId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/workspace/whatsapp/settings
 */
router.get("/settings", async (req, res, next) => {
  try {
    const settings = await TenantWhatsAppSettings.findOne({ tenant: req.tenantId }).lean();
    return res.json({ settings: settings || {} });
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /api/workspace/whatsapp/settings
 * Updates auto-reply template and lead alert preferences.
 */
router.put("/settings", async (req, res, next) => {
  try {
    const { autoReplyEnabled, autoReplyTemplate, leadAlertEnabled, leadAlertPhone } = req.body ?? {};

    const update = {};
    if (typeof autoReplyEnabled === "boolean") update.autoReplyEnabled = autoReplyEnabled;
    if (typeof autoReplyTemplate === "string") update.autoReplyTemplate = autoReplyTemplate.slice(0, 1000);
    if (typeof leadAlertEnabled === "boolean") update.leadAlertEnabled = leadAlertEnabled;
    if (typeof leadAlertPhone === "string") update.leadAlertPhone = leadAlertPhone.trim();

    const settings = await TenantWhatsAppSettings.findOneAndUpdate(
      { tenant: req.tenantId },
      { $set: update },
      { new: true, upsert: true }
    );

    return res.json({ message: "WhatsApp settings updated.", settings });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/workspace/whatsapp/preview-template
 */
router.post("/preview-template", async (req, res, next) => {
  try {
    const { template } = req.body ?? {};
    const businessName = req.user?.business?.name || "Your Business";
    const preview = previewTemplate(template, businessName);
    return res.json({ preview });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/workspace/whatsapp/test-message
 * Sends a test message through tenant's live socket to verify connection.
 */
router.post("/test-message", async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    if (!phone || !isValidPhoneNumber(phone)) {
      return res.status(400).json({ message: "Provide a valid mobile phone number." });
    }

    const businessName = req.user?.business?.name || "WebMintra Workspace";
    const result = await tenantWhatsAppManager.sendTenantMessage(req.tenantId, {
      recipient: phone,
      message: `👋 Hello! This is a test alert from ${businessName}. Your WhatsApp automation is active and working! 🚀`,
    });

    return res.json({ message: `Test message sent to ${phone}`, result });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/workspace/whatsapp/send-message
 * Sends a direct manual follow-up to a captured lead.
 */
router.post("/send-message", async (req, res, next) => {
  try {
    const { leadId, recipient, message } = req.body ?? {};
    if (!recipient || !isValidPhoneNumber(recipient)) {
      return res.status(400).json({ message: "Valid recipient phone number is required." });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message text cannot be empty." });
    }

    // Verify lead ownership if leadId provided
    if (leadId) {
      const lead = await FormSubmission.findOne({ _id: leadId, tenantId: req.tenantId }).lean();
      if (!lead) return res.status(404).json({ message: "Lead not found." });
      if (lead.whatsappOptOut) {
        return res.status(400).json({ message: "This lead has opted out of WhatsApp messages." });
      }
    }

    // Enqueue message job
    const result = await whatsAppQueueService.enqueueMessage({
      tenantId: req.tenantId,
      leadId: leadId || null,
      recipient,
      message: message.trim(),
      messageType: "manual_followup",
    });

    return res.status(202).json({ message: "Message queued for delivery.", ...result });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/workspace/whatsapp/messages
 * Returns message log for this tenant.
 */
router.get("/messages", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      WhatsAppMessageJob.find({ tenant: req.tenantId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WhatsAppMessageJob.countDocuments({ tenant: req.tenantId }),
    ]);

    return res.json({
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * ══ CAMPAIGNS ═════════════════════════════════════════════════════
 */

router.get("/campaigns", async (req, res, next) => {
  try {
    const [campaigns, eligibleLeads] = await Promise.all([
      WhatsAppCampaign.find({ tenant: req.tenantId }).sort({ createdAt: -1 }).lean(),
      whatsAppCampaignService.getEligibleLeadsCount(req.tenantId),
    ]);

    return res.json({ campaigns, eligibleLeads });
  } catch (error) {
    return next(error);
  }
});

router.post("/campaigns", async (req, res, next) => {
  try {
    const { name, message } = req.body ?? {};
    const campaign = await whatsAppCampaignService.createCampaign(req.tenantId, { name, message });
    return res.status(201).json({ message: "Campaign created and queued for dispatch.", campaign });
  } catch (error) {
    return next(error);
  }
});

router.post("/campaigns/:id/pause", async (req, res, next) => {
  try {
    const campaign = await whatsAppCampaignService.pauseCampaign(req.tenantId, req.params.id);
    return res.json({ message: "Campaign paused.", campaign });
  } catch (error) {
    return next(error);
  }
});

router.post("/campaigns/:id/resume", async (req, res, next) => {
  try {
    const campaign = await whatsAppCampaignService.resumeCampaign(req.tenantId, req.params.id);
    return res.json({ message: "Campaign resumed.", campaign });
  } catch (error) {
    return next(error);
  }
});

router.post("/campaigns/:id/cancel", async (req, res, next) => {
  try {
    const campaign = await whatsAppCampaignService.cancelCampaign(req.tenantId, req.params.id);
    return res.json({ message: "Campaign cancelled.", campaign });
  } catch (error) {
    return next(error);
  }
});

export default router;
