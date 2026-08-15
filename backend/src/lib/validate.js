/**
 * Input validation helpers.
 * Lightweight validators — no external deps needed.
 */

export function isString(v, { min = 1, max = 255 } = {}) {
  return typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
}

export function isEmail(v) {
  return typeof v === "string" && /^\S+@\S+\.\S+$/.test(v.trim());
}

export function isUrl(v) {
  if (typeof v !== "string") return false;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

export function isNumber(v, { min = -Infinity, max = Infinity } = {}) {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

export function isInteger(v, { min = -Infinity, max = Infinity } = {}) {
  return Number.isInteger(v) && v >= min && v <= max;
}

export function isBoolean(v) {
  return typeof v === "boolean";
}

export function isArray(v, { min = 0, max = 1000, itemCheck } = {}) {
  if (!Array.isArray(v)) return false;
  if (v.length < min || v.length > max) return false;
  if (itemCheck) return v.every(itemCheck);
  return true;
}

export function isEnum(v, values) {
  return values.includes(v);
}

export function isMongoId(v) {
  return typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
}

export function isSlug(v) {
  return typeof v === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
}

/**
 * Build a validated & sanitized object from a map of field definitions.
 * Returns { data, errors }.
 *
 * @param {object} body - Raw request body
 * @param {object} fieldMap - { fieldName: { validator, transform, required, default } }
 */
export function validate(body, fieldMap) {
  const data = {};
  const errors = [];
  const b = body ?? {};

  for (const [field, def] of Object.entries(fieldMap)) {
    const raw = b[field];
    const hasValue = raw !== undefined && raw !== null;

    if (!hasValue && def.required) {
      errors.push(`${field} is required.`);
      continue;
    }

    if (!hasValue && "default" in def) {
      data[field] = def.default;
      continue;
    }

    if (!hasValue) continue;

    if (def.validator && !def.validator(raw)) {
      errors.push(def.message ?? `${field} is invalid.`);
      continue;
    }

    data[field] = def.transform ? def.transform(raw) : raw;
  }

  return { data, errors, ok: errors.length === 0 };
}

/**
 * Parse pagination query params.
 */
export function parsePagination(query) {
  const page = Math.max(1, parseInt(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build sort object from query string: e.g. `sort=createdAt:desc`
 */
export function parseSort(query, allowed = ["createdAt", "updatedAt"]) {
  const raw = query?.sort;
  if (!raw || typeof raw !== "string") return { createdAt: -1 };
  const [field, dir] = raw.split(":");
  if (!allowed.includes(field)) return { createdAt: -1 };
  return { [field]: dir === "asc" ? 1 : -1 };
}

/**
 * Strip undefined fields from an object (for partial updates).
 */
export function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/**
 * Escapes regex special characters to prevent ReDoS / query injection in MongoDB.
 */
export function escapeRegex(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sanitizes arbitrary form submission JSON data to prevent Stored XSS / memory exhaustion.
 */
export function sanitizeFormData(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const safe = {};
  const keys = Object.keys(body).slice(0, 50); // cap max fields
  for (const k of keys) {
    // Sanitize key name
    const safeKey = String(k).slice(0, 80).replace(/[^\w\s-]/g, "").trim();
    if (!safeKey) continue;
    const v = body[k];
    if (typeof v === "string") {
      safe[safeKey] = v.slice(0, 5000);
    } else if (typeof v === "number" && Number.isFinite(v)) {
      safe[safeKey] = v;
    } else if (typeof v === "boolean") {
      safe[safeKey] = v;
    }
  }
  return safe;
}
