/**
 * Multi-Tenant WhatsApp Session Lifecycle Manager (Powered by Baileys)
 *
 * - Maintains an in-memory session pool: Map<tenantId, SessionState>
 * - Stores isolated multi-file auth keys in `.whatsapp-sessions/tenant_<tenantId>/`
 * - Guarantees strict tenant isolation: no tenant can access another's socket
 * - Automatically recovers sessions on server boot with controlled concurrency
 * - Never spawns duplicate sockets for the same tenant
 */

import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import path from "node:path";
import fs from "node:fs";
import pino from "pino";
import { TenantWhatsAppSettings } from "../models/TenantWhatsAppSettings.js";
import { toWhatsAppJid, normalizePhoneNumber } from "../lib/phone.js";

const SESSIONS_ROOT = path.resolve(process.cwd(), ".whatsapp-sessions");

class TenantWhatsAppManager {
  constructor() {
    /** @type {Map<string, { sock: any, status: string, qr: string|null, qrDataUrl: string|null, isConnecting: boolean }>} */
    this.sessions = new Map();
    this.ensureSessionDirectory();
  }

  ensureSessionDirectory() {
    if (!fs.existsSync(SESSIONS_ROOT)) {
      fs.mkdirSync(SESSIONS_ROOT, { recursive: true });
    }
  }

  getTenantSessionDir(tenantId) {
    const cleanId = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, "");
    return path.join(SESSIONS_ROOT, `tenant_${cleanId}`);
  }

  /**
   * Returns current status and QR data for a specific tenant.
   * Derives from in-memory pool if active, else falls back to MongoDB metadata.
   */
  async getTenantStatus(tenantId) {
    const key = String(tenantId);
    const inMemory = this.sessions.get(key);

    let dbSettings = await TenantWhatsAppSettings.findOne({ tenant: tenantId }).lean();
    if (!dbSettings) {
      dbSettings = await TenantWhatsAppSettings.create({
        tenant: tenantId,
        connectionStatus: "DISCONNECTED",
        isConnected: false,
      });
    }

    if (inMemory) {
      return {
        status: inMemory.status,
        isConnected: inMemory.status === "CONNECTED",
        hasQr: Boolean(inMemory.qrDataUrl),
        qrDataUrl: inMemory.qrDataUrl,
        connectedPhone: dbSettings.connectedPhone || "",
        connectedPushName: dbSettings.connectedPushName || "",
        lastConnectedAt: dbSettings.lastConnectedAt,
        autoReplyEnabled: dbSettings.autoReplyEnabled,
        autoReplyTemplate: dbSettings.autoReplyTemplate,
        leadAlertEnabled: dbSettings.leadAlertEnabled,
        leadAlertPhone: dbSettings.leadAlertPhone,
      };
    }

    return {
      status: dbSettings.connectionStatus || "DISCONNECTED",
      isConnected: Boolean(dbSettings.isConnected),
      hasQr: false,
      qrDataUrl: null,
      connectedPhone: dbSettings.connectedPhone || "",
      connectedPushName: dbSettings.connectedPushName || "",
      lastConnectedAt: dbSettings.lastConnectedAt,
      autoReplyEnabled: dbSettings.autoReplyEnabled,
      autoReplyTemplate: dbSettings.autoReplyTemplate,
      leadAlertEnabled: dbSettings.leadAlertEnabled,
      leadAlertPhone: dbSettings.leadAlertPhone,
    };
  }

  /**
   * Initializes or connects a tenant's isolated Baileys socket.
   */
  async initTenantSession(tenantId) {
    const key = String(tenantId);
    const existing = this.sessions.get(key);

    // Prevent duplicate concurrent initialization
    if (existing?.sock && (existing.status === "CONNECTED" || existing.isConnecting)) {
      return this.getTenantStatus(tenantId);
    }

    const sessionDir = this.getTenantSessionDir(tenantId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const sessionState = {
      sock: null,
      status: "CONNECTING",
      qr: null,
      qrDataUrl: null,
      isConnecting: true,
    };
    this.sessions.set(key, sessionState);

    await TenantWhatsAppSettings.findOneAndUpdate(
      { tenant: tenantId },
      { $set: { connectionStatus: "CONNECTING" } },
      { upsert: true }
    );

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({
        version: [2, 3000, 1015901307],
      }));

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["WebMintra Business", "Chrome", "1.0.0"],
        syncFullHistory: false,
      });

      sessionState.sock = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          sessionState.qr = qr;
          sessionState.status = "QR_READY";
          sessionState.isConnecting = false;
          try {
            sessionState.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          } catch {}

          await TenantWhatsAppSettings.updateOne(
            { tenant: tenantId },
            { $set: { connectionStatus: "QR_READY", isConnected: false } }
          );
        }

        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          sessionState.status = shouldReconnect ? "RECONNECTING" : "LOGGED_OUT";
          sessionState.isConnected = false;
          sessionState.qr = null;
          sessionState.qrDataUrl = null;
          sessionState.isConnecting = false;

          await TenantWhatsAppSettings.updateOne(
            { tenant: tenantId },
            {
              $set: {
                connectionStatus: shouldReconnect ? "RECONNECTING" : "LOGGED_OUT",
                isConnected: false,
                lastDisconnectedAt: new Date(),
              },
            }
          );

          if (shouldReconnect) {
            setTimeout(() => {
              this.initTenantSession(tenantId).catch(() => {});
            }, 5000);
          } else {
            this.sessions.delete(key);
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            } catch {}
          }
        } else if (connection === "open") {
          sessionState.status = "CONNECTED";
          sessionState.qr = null;
          sessionState.qrDataUrl = null;
          sessionState.isConnecting = false;

          // Extract connected device phone number and push name
          const userJid = sock.user?.id || "";
          const connectedPhone = normalizePhoneNumber(userJid.split(":")[0]) || "";
          const connectedPushName = sock.user?.name || "";

          await TenantWhatsAppSettings.updateOne(
            { tenant: tenantId },
            {
              $set: {
                connectionStatus: "CONNECTED",
                isConnected: true,
                connectedPhone,
                connectedPushName,
                lastConnectedAt: new Date(),
              },
            }
          );
          console.log(`✅ [Tenant ${tenantId}] WhatsApp session connected (${connectedPhone})`);
        }
      });

      return this.getTenantStatus(tenantId);
    } catch (error) {
      sessionState.isConnecting = false;
      sessionState.status = "ERROR";
      await TenantWhatsAppSettings.updateOne(
        { tenant: tenantId },
        { $set: { connectionStatus: "ERROR", isConnected: false } }
      );
      console.warn(`[Tenant ${tenantId}] WhatsApp init failed:`, error.message);
      return this.getTenantStatus(tenantId);
    }
  }

  /**
   * Logs out and terminates a tenant's session, deleting their session folder.
   */
  async logoutTenantSession(tenantId) {
    const key = String(tenantId);
    const existing = this.sessions.get(key);

    if (existing?.sock) {
      try {
        await existing.sock.logout().catch(() => {});
        existing.sock.end();
      } catch {}
    }

    this.sessions.delete(key);

    const sessionDir = this.getTenantSessionDir(tenantId);
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch {}

    await TenantWhatsAppSettings.findOneAndUpdate(
      { tenant: tenantId },
      {
        $set: {
          connectionStatus: "LOGGED_OUT",
          isConnected: false,
          connectedPhone: "",
          connectedPushName: "",
          lastDisconnectedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return { success: true, message: "WhatsApp unlinked and session cleared." };
  }

  /**
   * Reconnects a tenant session (wipes stale state and requests fresh QR).
   */
  async reconnectTenantSession(tenantId) {
    await this.logoutTenantSession(tenantId);
    return this.initTenantSession(tenantId);
  }

  /**
   * Sends a message through a tenant's active session.
   *
   * @param {string|import("mongoose").Types.ObjectId} tenantId
   * @param {{ recipient: string, message: string }} options
   */
  async sendTenantMessage(tenantId, { recipient, message }) {
    const key = String(tenantId);
    const session = this.sessions.get(key);

    if (!session?.sock || session.status !== "CONNECTED") {
      throw new Error("Tenant WhatsApp device is not currently connected.");
    }

    const jid = toWhatsAppJid(recipient);
    if (!jid) {
      throw new Error(`Invalid recipient phone number format: "${recipient}"`);
    }

    let targetJid = jid;
    if (typeof session.sock.onWhatsApp === "function") {
      const [res] = await session.sock.onWhatsApp(jid.replace("@s.whatsapp.net", "")).catch(() => []);
      if (res?.jid) {
        targetJid = res.jid;
      }
    }

    const result = await session.sock.sendMessage(targetJid, { text: message });
    return {
      success: true,
      messageId: result?.key?.id || null,
      target: targetJid,
    };
  }

  /**
   * Recovers active sessions on server boot with controlled concurrency.
   */
  async restoreAllSessions() {
    this.ensureSessionDirectory();
    try {
      const activeTenants = await TenantWhatsAppSettings.find({
        isConnected: true,
      }).select("tenant").lean();

      if (!activeTenants.length) return;

      console.log(`[WhatsApp Manager] Restoring ${activeTenants.length} tenant WhatsApp session(s)...`);

      // Controlled concurrency: 5 tenants initialized at a time
      const concurrency = 5;
      for (let i = 0; i < activeTenants.length; i += concurrency) {
        const batch = activeTenants.slice(i, i + concurrency);
        await Promise.allSettled(
          batch.map((t) => {
            const dir = this.getTenantSessionDir(t.tenant);
            if (fs.existsSync(dir)) {
              return this.initTenantSession(t.tenant);
            }
            return Promise.resolve();
          })
        );
      }
    } catch (err) {
      console.warn("[WhatsApp Manager] Session recovery error:", err.message);
    }
  }
}

export const tenantWhatsAppManager = new TenantWhatsAppManager();
