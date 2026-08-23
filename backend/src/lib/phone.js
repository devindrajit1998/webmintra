/**
 * Centralized Phone Number Normalization & Validation Utility
 *
 * Normalizes Indian & International numbers to clean E.164-compatible digit strings
 * and generates WhatsApp Baileys JIDs.
 */

/**
 * Normalizes a raw phone string into a clean digit-only format.
 * - If 10 digits are provided without a country code, defaults to India ('91').
 * - Strips leading '+' or '0'.
 * - Removes non-digit characters.
 *
 * @param {string} rawPhone
 * @returns {string|null} - Normalized digits (e.g. "919876543210") or null if invalid
 */
export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") return null;

  // Extract all digit characters
  let digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  // 10-digit Indian phone number without country code
  if (digits.length === 10) {
    // Valid Indian mobile numbers usually start with 6, 7, 8, or 9
    digits = `91${digits}`;
  } else if (digits.startsWith("0") && digits.length === 11) {
    // Leading zero trunk prefix (e.g. 09876543210 -> 919876543210)
    digits = `91${digits.slice(1)}`;
  }

  // Minimum length for a valid E.164 phone number is 10 digits (including country code), max 15
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

/**
 * Checks if a given raw phone string can be normalized into a valid phone number.
 *
 * @param {string} rawPhone
 * @returns {boolean}
 */
export function isValidPhoneNumber(rawPhone) {
  return normalizePhoneNumber(rawPhone) !== null;
}

/**
 * Converts a phone number to a WhatsApp JID string (<digits>@s.whatsapp.net).
 *
 * @param {string} rawPhone
 * @returns {string|null}
 */
export function toWhatsAppJid(rawPhone) {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) return null;
  return `${normalized}@s.whatsapp.net`;
}

/**
 * Extracts a normalized phone number and name from generic form data key-value pairs.
 * Searches common field names like 'phone', 'mobile', 'whatsapp', 'name', 'full_name'.
 *
 * @param {Record<string, any>} formData
 * @returns {{ phone: string|null, name: string|null, email: string|null }}
 */
export function extractContactFromFormData(formData) {
  if (!formData || typeof formData !== "object") {
    return { phone: null, name: null, email: null };
  }

  let phone = null;
  let name = null;
  let email = null;

  for (const [key, val] of Object.entries(formData)) {
    if (typeof val !== "string") continue;
    const cleanVal = val.trim();
    if (!cleanVal) continue;
    const lk = key.toLowerCase();

    // Phone matching
    if (!phone && (lk.includes("phone") || lk.includes("mobile") || lk.includes("whatsapp") || lk.includes("contact") || lk.includes("tel") || lk.includes("number"))) {
      if (isValidPhoneNumber(cleanVal)) {
        phone = normalizePhoneNumber(cleanVal);
      }
    }

    // Name matching (avoid matching field names like 'promo_code_name' or 'restaurant_name')
    if (!name && (lk.includes("full name") || lk.includes("fullname") || lk.includes("your name") || lk.includes("first_name") || lk.includes("customer") || lk === "name")) {
      if (cleanVal.length > 0 && cleanVal.length < 100) {
        name = cleanVal;
      }
    }

    // Email matching
    if (!email && (lk.includes("email") || lk.includes("mail"))) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanVal)) {
        email = cleanVal.toLowerCase();
      }
    }
  }

  // Fallback: If phone wasn't detected by key name, check if any value is a 10-15 digit phone number
  if (!phone) {
    for (const val of Object.values(formData)) {
      if (typeof val === "string" && isValidPhoneNumber(val.trim())) {
        phone = normalizePhoneNumber(val.trim());
        break;
      }
    }
  }

  return { phone, name, email };
}

