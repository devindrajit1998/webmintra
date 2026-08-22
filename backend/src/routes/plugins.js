import { Router } from "express";
import mongoose from "mongoose";
import { establishTenantContext, requireAuthenticatedUser, requireRole } from "../middleware/auth.js";
import { WebsitePlugin } from "../models/WebsitePlugin.js";
import { Website } from "../models/Website.js";
import { PLUGIN_CATALOG } from "../lib/plugins-registry.js";
import { ownedWebsiteScope } from "../lib/tenant-scope.js";

const router = Router();

router.use(requireAuthenticatedUser, requireRole("tenant"), establishTenantContext);

// ── GET /api/plugins/catalog ────────────────────────────────────
router.get("/catalog", (_req, res) => {
  return res.json({ catalog: PLUGIN_CATALOG });
});

// ── GET /api/plugins/:websiteId ─────────────────────────────────
router.get("/:websiteId", async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    if (!mongoose.isObjectIdOrHexString(websiteId)) {
      return res.status(400).json({ message: "Invalid website ID" });
    }

    const website = await Website.findOne(ownedWebsiteScope(req.user, websiteId));
    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    const installed = await WebsitePlugin.find({ website: websiteId }).lean();
    return res.json({ plugins: installed, catalog: PLUGIN_CATALOG });
  } catch (error) {
    return next(error);
  }
});

// ── POST /api/plugins/:websiteId/toggle ─────────────────────────
router.post("/:websiteId/toggle", async (req, res, next) => {
  try {
    const { websiteId } = req.params;
    const { pluginSlug, isEnabled } = req.body;

    if (!mongoose.isObjectIdOrHexString(websiteId) || !pluginSlug) {
      return res.status(400).json({ message: "websiteId and pluginSlug are required." });
    }

    const website = await Website.findOne(ownedWebsiteScope(req.user, websiteId));
    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    const catalogItem = PLUGIN_CATALOG.find((p) => p.slug === pluginSlug);
    const defaultConfig = catalogItem?.defaultConfig || {};

    const plugin = await WebsitePlugin.findOneAndUpdate(
      { website: websiteId, pluginSlug },
      {
        $set: {
          isEnabled: Boolean(isEnabled),
          owner: req.user._id,
        },
        $setOnInsert: {
          config: defaultConfig,
          installedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.json({ message: "Plugin updated successfully", plugin });
  } catch (error) {
    return next(error);
  }
});

// ── PUT /api/plugins/:websiteId/:pluginSlug ─────────────────────
router.put("/:websiteId/:pluginSlug", async (req, res, next) => {
  try {
    const { websiteId, pluginSlug } = req.params;
    const { config, isEnabled } = req.body;

    if (!mongoose.isObjectIdOrHexString(websiteId) || !pluginSlug) {
      return res.status(400).json({ message: "websiteId and pluginSlug are required." });
    }

    const website = await Website.findOne(ownedWebsiteScope(req.user, websiteId));
    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    const updateDoc = {};
    if (config !== undefined) updateDoc.config = config;
    if (isEnabled !== undefined) updateDoc.isEnabled = Boolean(isEnabled);

    const plugin = await WebsitePlugin.findOneAndUpdate(
      { website: websiteId, pluginSlug },
      {
        $set: updateDoc,
        $setOnInsert: {
          owner: req.user._id,
          installedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.json({ message: "Plugin settings saved successfully", plugin });
  } catch (error) {
    return next(error);
  }
});

export default router;
