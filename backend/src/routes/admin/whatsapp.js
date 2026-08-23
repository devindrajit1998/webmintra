/**
 * Admin WhatsApp Management Routes
 * /api/admin/whatsapp
 */

import { Router } from "express";
import { requireAuthenticatedUser, requireRole } from "../../middleware/auth.js";
import { getWhatsAppStatus, logoutWhatsApp, initWhatsAppClient, sendWhatsAppNotification } from "../../services/whatsapp.js";

const router = Router();

// Only admin users can manage platform WhatsApp connection
router.use(requireAuthenticatedUser, requireRole("admin"));

/**
 * GET /api/admin/whatsapp/status
 * Returns connection status and QR code data URL (if waiting for link)
 */
router.get("/status", async (req, res, next) => {
  try {
    const status = await getWhatsAppStatus();
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/admin/whatsapp/reconnect
 * Triggers re-initialization if disconnected
 */
router.post("/reconnect", async (req, res, next) => {
  try {
    await initWhatsAppClient();
    const status = await getWhatsAppStatus();
    return res.json({ message: "WhatsApp client init triggered.", ...status });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/admin/whatsapp/logout
 * Logs out and clears local session
 */
router.post("/logout", async (req, res, next) => {
  try {
    const result = await logoutWhatsApp();
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/admin/whatsapp/test
 * Sends a test WhatsApp message to verify connection
 */
router.post("/test", async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ message: "Phone number is required." });
    }

    await sendWhatsAppNotification({
      phone,
      message: "👋 Hello from WebMintra! Your self-hosted WhatsApp alert engine is working perfectly. 🚀",
    });

    return res.json({ message: `Test message sent to ${phone}` });
  } catch (error) {
    return next(error);
  }
});

export default router;
