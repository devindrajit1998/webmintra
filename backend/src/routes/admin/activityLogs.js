/**
 * Activity Log Routes
 * /api/admin/activity-logs
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { ActivityLog, ACTIVITY_ACTIONS } from "../../models/ActivityLog.js";
import { parsePagination, parseSort, isMongoId } from "../../lib/validate.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["createdAt"]);
    const filter = {};

    if (req.query.action && ACTIVITY_ACTIONS.includes(req.query.action)) filter.action = req.query.action;
    if (req.query.actor && isMongoId(req.query.actor)) filter.actor = req.query.actor;
    if (req.query.resourceType) filter["resource.type"] = req.query.resourceType;
    if (req.query.search) {
      filter.$or = [
        { description: { $regex: req.query.search, $options: "i" } },
        { actorName: { $regex: req.query.search, $options: "i" } },
        { actorEmail: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Date range
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return res.json({
      logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      availableActions: ACTIVITY_ACTIONS,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:logId", async (req, res, next) => {
  try {
    if (!isMongoId(req.params.logId)) return res.status(400).json({ message: "Invalid log ID." });
    const log = await ActivityLog.findById(req.params.logId).lean();
    if (!log) return res.status(404).json({ message: "Log entry not found." });
    return res.json({ log });
  } catch (error) {
    return next(error);
  }
});

// ── Activity stats ─────────────────────────────────────────────
router.get("/stats/summary", async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byAction, byActor, daily] = await Promise.all([
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { id: "$actor", name: "$actorName", email: "$actorEmail" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.json({ byAction, byActor, daily, days, from });
  } catch (error) {
    return next(error);
  }
});

export default router;
