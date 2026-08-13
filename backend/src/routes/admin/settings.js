/**
 * Platform Settings Routes
 * /api/admin/settings
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { Setting, DEFAULT_SETTINGS } from "../../models/Setting.js";
import { normalizeSeoUpdates, SEO_SETTING_KEYS } from "../../lib/seo-settings.js";
import { logActivity, buildLogContext } from "../../services/activityLog.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

// ── Seed defaults if not present ──────────────────────────────
async function seedDefaults() {
  for (const def of DEFAULT_SETTINGS) {
    await Setting.updateOne({ key: def.key }, { $setOnInsert: def }, { upsert: true });
  }
}

// ── Get All Settings (grouped) ────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    await seedDefaults();
    const group = req.query.group;
    const filter = {};
    if (group) filter.group = group;

    const settings = await Setting.find(filter).sort({ group: 1, key: 1 }).lean();

    return res.json({
      settings: settings.map(s => ({
        key: s.key,
        value: s.value,
        group: s.group,
        label: s.label,
        description: s.description,
        type: s.type,
        isPublic: s.isPublic,
        updatedAt: s.updatedAt,
      }))
    });
  } catch (error) {
    return next(error);
  }
});

// ── Update Landing Page SEO ───────────────────────────────────
router.patch("/seo", async (req, res, next) => {
  try {
    await seedDefaults();

    let updates;
    try {
      updates = normalizeSeoUpdates(req.body?.settings);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "Provide at least one SEO setting." });
    }

    const operations = updates.map(({ key, value }) => ({
      updateOne: {
        filter: { key },
        update: { $set: { value, updatedBy: req.user._id } },
      },
    }));
    await Setting.bulkWrite(operations);

    const settings = await Setting.find({ key: { $in: SEO_SETTING_KEYS } })
      .select("key value updatedAt")
      .sort({ key: 1 })
      .lean();

    await logActivity({
      ...buildLogContext(req),
      action: "settings_updated",
      description: `Landing page SEO updated: ${updates.map(({ key }) => key).join(", ")}.`,
      resource: { type: "setting", id: "landing-page-seo", name: "Landing page SEO" },
    });

    return res.json({ message: "Landing page SEO updated.", settings });
  } catch (error) {
    return next(error);
  }
});

// ── Get Single Setting ────────────────────────────────────────
router.get("/:key", async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key }).lean();
    if (!setting) return res.status(404).json({ message: "Setting not found." });
    return res.json({ setting });
  } catch (error) {
    return next(error);
  }
});

// ── Update Single Setting ─────────────────────────────────────
router.put("/:key", async (req, res, next) => {
  try {
    const { value, label, description } = req.body ?? {};
    if (value === undefined) return res.status(400).json({ message: "value is required." });

    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { $set: { value, label, description, updatedBy: req.user._id } },
      { new: true, upsert: false },
    );

    if (!setting) return res.status(404).json({ message: "Setting not found." });

    await logActivity({
      ...buildLogContext(req),
      action: "settings_updated",
      description: `Setting "${req.params.key}" updated.`,
      resource: { type: "setting", id: req.params.key, name: req.params.key },
      changes: { before: { value: setting.value }, after: { value } },
    });

    return res.json({ setting });
  } catch (error) {
    return next(error);
  }
});

// ── Bulk Update Settings ──────────────────────────────────────
router.patch("/", async (req, res, next) => {
  try {
    const updates = req.body?.settings;
    if (!Array.isArray(updates) || updates.length === 0)
      return res.status(400).json({ message: "Provide an array of settings updates: [{ key, value }]." });

    if (updates.length > 50)
      return res.status(400).json({ message: "Cannot update more than 50 settings at once." });

    const results = [];
    for (const { key, value } of updates) {
      if (!key || value === undefined) continue;
      const setting = await Setting.findOneAndUpdate(
        { key },
        { $set: { value, updatedBy: req.user._id } },
        { new: true },
      );
      if (setting) results.push(setting);
    }

    await logActivity({
      ...buildLogContext(req),
      action: "settings_updated",
      description: `Bulk settings update: ${results.map((s) => s.key).join(", ")}.`,
    });

    return res.json({ message: `${results.length} settings updated.`, updated: results.map((s) => s.key) });
  } catch (error) {
    return next(error);
  }
});

// ── Toggle Maintenance Mode ───────────────────────────────────
router.post("/maintenance/toggle", async (req, res, next) => {
  try {
    const current = await Setting.findOne({ key: "site.maintenanceMode" });
    const newValue = current ? !current.value : true;

    await Setting.findOneAndUpdate(
      { key: "site.maintenanceMode" },
      { $set: { value: newValue, updatedBy: req.user._id } },
      { upsert: true },
    );

    await logActivity({
      ...buildLogContext(req),
      action: "settings_updated",
      description: `Maintenance mode ${newValue ? "enabled" : "disabled"}.`,
    });

    return res.json({ maintenanceMode: newValue, message: `Maintenance mode ${newValue ? "enabled" : "disabled"}.` });
  } catch (error) {
    return next(error);
  }
});

// ── Public settings (no auth required) ───────────────────────
const publicRouter = Router();
publicRouter.get("/", async (req, res, next) => {
  try {
    await seedDefaults();
    const settings = await Setting.find({ isPublic: true }).select("key value").lean();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json({ settings: map });
  } catch (error) {
    return next(error);
  }
});

export { publicRouter };
export default router;
