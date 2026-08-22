/**
 * WhatsApp Notification Service
 *
 * Sends a WhatsApp message to a phone number via a configured provider.
 * Supports WATI (popular in India) via its REST API.
 *
 * Required env vars (all optional — if missing, silently skipped):
 *   WATI_API_ENDPOINT  e.g. https://live-server.wati.io
 *   WATI_API_TOKEN     Bearer token from WATI dashboard
 *
 * How to get these:
 *   1. Sign up at wati.io
 *   2. Go to Settings → API → copy your API endpoint and token
 */

/**
 * Sends a WhatsApp text message to a phone number.
 * Fails silently — never throws, so it never breaks the caller's flow.
 *
 * @param {object} options
 * @param {string} options.phone  - Phone number with country code, e.g. "+919876543210"
 * @param {string} options.message - The message text to send
 */
export async function sendWhatsAppNotification({ phone, message }) {
    const endpoint = process.env.WATI_API_ENDPOINT;
    const token = process.env.WATI_API_TOKEN;

    if (!endpoint || !token) return; // Not configured — skip silently

    // Normalize phone: strip non-digits except leading +
    const normalizedPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
    if (!normalizedPhone || normalizedPhone.length < 7) return;

    try {
        const url = `${endpoint.replace(/\/$/, "")}/api/v1/sendSessionMessage/${encodeURIComponent(normalizedPhone)}`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ messageText: message }),
            signal: AbortSignal.timeout(8000), // 8 second timeout
        });

        if (!response.ok) {
            const body = await response.text().catch(() => "");
            console.warn(`[WhatsApp] WATI API returned ${response.status}: ${body.slice(0, 200)}`);
        }
    } catch (error) {
        // Fail silently — a WhatsApp notification failure must never break form submissions
        console.warn("[WhatsApp] Notification failed (non-critical):", error?.message || error);
    }
}
