/**
 * Safe Template Compiler for WhatsApp Messages
 *
 * Supports dynamic variables like:
 * - {{name}}         -> Contact Name (fallback: 'there')
 * - {{businessName}} -> Tenant Business Name (fallback: 'our team')
 * - {{phone}}        -> Contact Phone Number
 * - {{email}}        -> Contact Email
 * - {{siteName}}     -> Website Name
 */

/**
 * Replaces placeholders in a template with actual variables or safe fallbacks.
 *
 * @param {string} template
 * @param {Record<string, string>} variables
 * @returns {string}
 */
export function renderTemplate(template, variables = {}) {
  if (!template || typeof template !== "string") {
    return "";
  }

  const safeFallbacks = {
    name: "there",
    businessName: "our team",
    phone: "",
    email: "",
    siteName: "our website",
  };

  const merged = { ...safeFallbacks, ...variables };

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, tag) => {
    const val = merged[tag];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim();
    }
    return safeFallbacks[tag] || "";
  }).replace(/\s{2,}/g, " ").trim();
}

/**
 * Generates sample previews for the tenant UI.
 *
 * @param {string} template
 * @param {string} businessName
 * @returns {string}
 */
export function previewTemplate(template, businessName = "Your Business") {
  return renderTemplate(template, {
    name: "Rahul Sharma",
    businessName,
    phone: "+91 98765 43210",
    email: "rahul@example.com",
    siteName: businessName,
  });
}
