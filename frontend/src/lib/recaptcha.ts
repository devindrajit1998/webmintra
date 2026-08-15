/**
 * Google reCAPTCHA v3 Frontend Integration
 * Invisible, score-based security without annoying puzzles.
 */

declare global {
  interface Window {
    grecaptcha: any;
  }
}

let scriptLoaded = false;
let loadPromise: Promise<boolean> | null = null;

export function loadGoogleRecaptcha(siteKey: string): Promise<boolean> {
  if (!siteKey || typeof window === "undefined") return Promise.resolve(false);
  if (scriptLoaded || window.grecaptcha) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector(`script[src*="recaptcha/api.js"]`);
    if (existing) {
      scriptLoaded = true;
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve(true);
    };
    script.onerror = () => {
      console.warn("[reCAPTCHA] Failed to load Google reCAPTCHA script.");
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function executeRecaptcha(
  siteKey: string,
  action: string = "submit",
): Promise<string | null> {
  if (!siteKey || typeof window === "undefined") return null;

  try {
    const ready = await loadGoogleRecaptcha(siteKey);
    if (!ready || !window.grecaptcha) return null;

    return await new Promise<string | null>((resolve) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(siteKey, { action });
          resolve(token || null);
        } catch (err) {
          console.warn("[reCAPTCHA execution warning]:", err);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.warn("[reCAPTCHA token error]:", error);
    return null;
  }
}
