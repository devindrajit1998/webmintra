/**
 * Free Self-Hosted Node.js WhatsApp Service (Powered by Baileys)
 *
 * - Runs 100% locally on your Node server (zero subscription / no per-message fees).
 * - Saves session auth in backend/.whatsapp-auth/ so pairing is only needed once.
 * - Auto-reconnects on server restart or network drop.
 * - Prints QR in terminal on first run or when session is disconnected.
 */

import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import path from "node:path";
import fs from "node:fs";
import pino from "pino";

import QRCode from "qrcode";

let sock = null;
let isConnecting = false;
let qrCodeString = null;
let connectionStatus = "disconnected"; // 'disconnected' | 'connecting' | 'waiting_for_qr' | 'connected'

const AUTH_DIR = path.resolve(process.cwd(), ".whatsapp-auth");

export async function getWhatsAppStatus() {
  let qrDataUrl = null;
  if (qrCodeString) {
    try {
      qrDataUrl = await QRCode.toDataURL(qrCodeString, { margin: 2, scale: 6 });
    } catch {}
  }

  return {
    status: connectionStatus,
    hasQr: Boolean(qrCodeString),
    qr: qrCodeString,
    qrDataUrl,
    isAuthenticated: connectionStatus === "connected",
  };
}

export async function logoutWhatsApp() {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
      sock.end();
      sock = null;
    }
    isConnecting = false;
    connectionStatus = "disconnected";
    qrCodeString = null;
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    // Re-initialize to generate a fresh QR
    setTimeout(() => {
      initWhatsAppClient().catch(() => {});
    }, 1000);
    return { success: true, message: "WhatsApp logged out and session cleared." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function initWhatsAppClient() {
  if (sock || isConnecting) return;
  isConnecting = true;
  connectionStatus = "connecting";

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: "silent" }), // keep server console clean
      browser: ["WebMintra Platform", "Chrome", "1.0.0"],
      syncFullHistory: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCodeString = qr;
        connectionStatus = "waiting_for_qr";
        console.log("\n=======================================================");
        console.log("👉 [WebMintra WhatsApp] Scan QR code above to link device");
        console.log("=======================================================\n");
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = "disconnected";
        sock = null;
        isConnecting = false;
        qrCodeString = null;

        console.log(`[WhatsApp] Connection closed. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(() => {
            initWhatsAppClient().catch((err) => console.error("[WhatsApp] Reconnect failed:", err.message));
          }, 5000);
        } else {
          console.log("[WhatsApp] Logged out. Session data deleted. Need new QR scan.");
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
        }
      } else if (connection === "open") {
        connectionStatus = "connected";
        qrCodeString = null;
        isConnecting = false;
        console.log("✅ [WebMintra WhatsApp] Connected and ready to send lead alerts!");
      }
    });
  } catch (error) {
    isConnecting = false;
    connectionStatus = "disconnected";
    console.warn("[WhatsApp] Init failed (will retry):", error?.message || error);
  }
}

/**
 * Format phone number to WhatsApp JID format: <country_code><number>@s.whatsapp.net
 */
function formatWhatsAppJid(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") return null;
  let digits = rawPhone.replace(/\D/g, "");
  
  // Default to 91 (India) if 10-digit Indian number is provided without country code
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = `91${digits.slice(1)}`;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  return `${digits}@s.whatsapp.net`;
}

/**
 * Sends a WhatsApp notification message.
 * Supports:
 * 1. Self-hosted Baileys client (primary free zero-cost engine)
 * 2. Fallback to WATI REST API if configured
 *
 * Fails gracefully and never breaks lead flow.
 */
export async function sendWhatsAppNotification({ phone, message }) {
  if (!phone || !message) return;

  // 1. Try free self-hosted Baileys client first
  if (sock && connectionStatus === "connected") {
    try {
      const jid = formatWhatsAppJid(phone);
      if (jid) {
        await sock.sendMessage(jid, { text: message });
        console.log(`[WhatsApp] Alert sent successfully via Baileys to ${jid}`);
        return;
      }
    } catch (err) {
      console.warn("[WhatsApp] Baileys dispatch failed:", err?.message || err);
    }
  }

  // 2. Optional Fallback: WATI API if environment variables are provided
  const watiEndpoint = process.env.WATI_API_ENDPOINT;
  const watiToken = process.env.WATI_API_TOKEN;

  if (watiEndpoint && watiToken) {
    try {
      const normalizedPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
      const url = `${watiEndpoint.replace(/\/$/, "")}/api/v1/sendSessionMessage/${encodeURIComponent(normalizedPhone)}`;
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${watiToken}`,
        },
        body: JSON.stringify({ messageText: message }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.warn("[WhatsApp] WATI fallback failed:", err?.message || err);
    }
  }
}
