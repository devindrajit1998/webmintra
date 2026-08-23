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
// Also accepts /api/plugins/:websiteId/toggle/:pluginSlug
router.post(["/:websiteId/toggle", "/:websiteId/toggle/:pluginSlug", "/:websiteId/:pluginSlug/toggle"], async (req, res, next) => {
  try {
    const websiteId = req.params.websiteId || req.body?.websiteId;
    const pluginSlug = req.body?.pluginSlug || req.body?.slug || req.params.pluginSlug;
    const isEnabled = req.body?.isEnabled !== undefined ? req.body.isEnabled : req.body?.enabled;

    if (!websiteId || !mongoose.isObjectIdOrHexString(websiteId)) {
      return res.status(400).json({ message: "Valid websiteId is required." });
    }
    if (!pluginSlug) {
      return res.status(400).json({ message: "pluginSlug is required." });
    }

    const website = await Website.findOne(ownedWebsiteScope(req.user, websiteId));
    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    const catalogItem = PLUGIN_CATALOG.find((p) => p.slug === pluginSlug);
    const defaultConfig = catalogItem?.defaultConfig || {};

    let plugin = await WebsitePlugin.findOne({ website: websiteId, pluginSlug });
    if (!plugin) {
      plugin = new WebsitePlugin({
        website: websiteId,
        pluginSlug,
        owner: req.user._id,
        isEnabled: Boolean(isEnabled),
        config: defaultConfig,
        installedAt: new Date(),
      });
    } else {
      plugin.owner = req.user._id;
      plugin.isEnabled = Boolean(isEnabled);
    }

    await plugin.save();

    return res.json({ message: "Plugin updated successfully", plugin: plugin.toObject() });
  } catch (error) {
    return next(error);
  }
});

// ── PUT /api/plugins/:websiteId/:pluginSlug ─────────────────────
router.put("/:websiteId/:pluginSlug", async (req, res, next) => {
  try {
    const websiteId = req.params.websiteId || req.body?.websiteId;
    const pluginSlug = req.params.pluginSlug || req.body?.pluginSlug;
    const { config, isEnabled } = req.body || {};

    if (!websiteId || !mongoose.isObjectIdOrHexString(websiteId)) {
      return res.status(400).json({ message: "Valid websiteId is required." });
    }
    if (!pluginSlug) {
      return res.status(400).json({ message: "pluginSlug is required." });
    }

    const website = await Website.findOne(ownedWebsiteScope(req.user, websiteId));
    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    // Use fetch+save instead of findOneAndUpdate for Mixed-type config field.
    // Mongoose requires markModified() to detect changes to Mixed fields.
    let plugin = await WebsitePlugin.findOne({ website: websiteId, pluginSlug });

    if (!plugin) {
      // Create a new plugin document
      const catalogItem = PLUGIN_CATALOG.find((p) => p.slug === pluginSlug);
      plugin = new WebsitePlugin({
        website: websiteId,
        pluginSlug,
        owner: req.user._id,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        config: config !== undefined ? config : (catalogItem?.defaultConfig || {}),
        installedAt: new Date(),
      });
    } else {
      plugin.owner = req.user._id;
      if (isEnabled !== undefined) plugin.isEnabled = Boolean(isEnabled);
      if (config !== undefined) {
        plugin.config = config;
        plugin.markModified("config"); // Required for Schema.Types.Mixed fields
      }
    }

    await plugin.save();

    return res.json({ message: "Plugin settings saved successfully", plugin: plugin.toObject() });

  } catch (error) {
    return next(error);
  }
});

export default router;
