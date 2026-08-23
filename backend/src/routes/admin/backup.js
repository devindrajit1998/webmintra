/**
 * Admin Database Backup Routes
 * /api/admin/backup
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import {
  runDatabaseBackup,
  listDatabaseBackups,
  getBackupDownloadUrl,
  deleteBackup,
  isR2Configured,
} from "../../services/backup.js";

const router = Router();
router.use(requireAuthenticatedUser, requireRole("admin"));

/**
 * GET /api/admin/backup/status
 * Returns whether R2 is configured + last backup info
 */
router.get("/status", async (req, res, next) => {
  try {
    const configured = isR2Configured();
    if (!configured) {
      return res.json({
        configured: false,
        message: "Cloudflare R2 credentials not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME to .env",
        backups: [],
      });
    }

    const backups = await listDatabaseBackups();
    const lastBackup = backups[0] || null;

    return res.json({
      configured: true,
      bucket: process.env.R2_BUCKET_NAME || "webmintra-backups",
      totalBackups: backups.length,
      lastBackup,
      nextScheduled: "Daily at 2:00 AM IST (automatic)",
      retentionPolicy: "Last 30 daily backups",
      backups,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/admin/backup/run
 * Triggers an on-demand backup immediately
 */
router.post("/run", async (req, res, next) => {
  try {
    if (!isR2Configured()) {
      return res.status(400).json({ message: "Cloudflare R2 is not configured. Please add R2 credentials in .env" });
    }

    console.log("[Admin Backup] Manual backup triggered by admin.");
    const result = await runDatabaseBackup();
    return res.json({
      message: "Database backup completed successfully!",
      ...result,
    });
  } catch (error) {
    console.error("[Admin Backup Error]:", error);
    return next(error);
  }
});

/**
 * GET /api/admin/backup/list
 * Lists all backups stored in R2
 */
router.get("/list", async (req, res, next) => {
  try {
    if (!isR2Configured()) {
      return res.status(400).json({ message: "Cloudflare R2 is not configured." });
    }

    const backups = await listDatabaseBackups();
    return res.json({ backups, total: backups.length });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/admin/backup/download
 * Returns a signed 1-hour download URL for a backup file from R2
 */
router.get("/download", async (req, res, next) => {
  try {
    const { key } = req.query;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ message: "Missing backup key parameter." });
    }

    if (!isR2Configured()) {
      return res.status(400).json({ message: "Cloudflare R2 is not configured." });
    }

    const url = await getBackupDownloadUrl(decodeURIComponent(key));
    return res.json({ url, expiresIn: 3600 });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/admin/backup
 * Deletes a specific backup file from R2
 */
router.delete("/", async (req, res, next) => {
  try {
    const { key } = req.query;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ message: "Missing backup key parameter." });
    }

    if (!isR2Configured()) {
      return res.status(400).json({ message: "Cloudflare R2 is not configured." });
    }

    await deleteBackup(decodeURIComponent(key));
    return res.json({ message: "Backup deleted successfully." });
  } catch (error) {
    return next(error);
  }
});

export default router;
