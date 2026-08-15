import { Setting } from "../models/Setting.js";

/**
 * Verifies a Google reCAPTCHA v3 / Enterprise token with Google's siteverify API.
 * If recaptcha is disabled in Admin settings or RECAPTCHA_SECRET_KEY is not set,
 * this verification transparently passes.
 *
 * @param {string} token - The client-side reCAPTCHA response token
 * @param {string} [remoteIp] - The user's IP address
 * @param {string} [expectedAction] - The action name e.g. "register", "login", "contact"
 * @returns {Promise<{ success: boolean; score?: number; error?: string }>}
 */
export async function verifyRecaptcha(token, remoteIp = "", expectedAction = "") {
  try {
    const enabledSetting = await Setting.findOne({ key: "security.recaptchaEnabled" }).lean();
    const isEnabled = enabledSetting ? Boolean(enabledSetting.value) : false;
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || "";

    // If reCAPTCHA is not enabled or no secret key configured in .env, pass gracefully
    if (!isEnabled || !secretKey) {
      return { success: true, bypassed: true };
    }

    if (!token) {
      return { success: false, error: "reCAPTCHA verification token missing." };
    }

    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const bodyParams = new URLSearchParams({
      secret: secretKey,
      response: token,
    });
    if (remoteIp) bodyParams.append("remoteip", remoteIp);

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString(),
    });

    const data = await response.json();

    if (!data.success) {
      return { success: false, error: "reCAPTCHA verification failed." };
    }

    // Check score threshold (Google reCAPTCHA v3 returns scores between 0.0 and 1.0)
    // 1.0 is very likely a human, 0.0 is very likely a bot
    const minScore = 0.5;
    if (data.score !== undefined && data.score < minScore) {
      return { success: false, score: data.score, error: "Bot detection score below security threshold." };
    }

    return { success: true, score: data.score, action: data.action };
  } catch (error) {
    console.error("[reCAPTCHA verification error]:", error);
    // On unexpected network failure with Google, allow request if graceful fallback is intended
    return { success: true, fallback: true };
  }
}
