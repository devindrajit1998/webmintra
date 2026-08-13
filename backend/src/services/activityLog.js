import { ActivityLog } from "../models/ActivityLog.js";

/**
 * Log an activity/audit event.
 * @param {object} options
 * @param {import('mongoose').Types.ObjectId|string} options.actor - Admin user ID
 * @param {string} options.actorName
 * @param {string} options.actorEmail
 * @param {string} options.action - One of ACTIVITY_ACTIONS enum values
 * @param {string} options.description - Human-readable description
 * @param {{ type: string, id: string, name: string }} [options.resource]
 * @param {{ before: object, after: object }} [options.changes]
 * @param {string} [options.ipAddress]
 * @param {string} [options.userAgent]
 * @param {object} [options.metadata]
 */
export async function logActivity(options) {
  try {
    await ActivityLog.create({
      actor: options.actor,
      actorName: options.actorName,
      actorEmail: options.actorEmail,
      action: options.action,
      description: options.description,
      resource: options.resource,
      changes: options.changes,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata ?? {},
    });
  } catch (err) {
    // Never fail a request because of logging failure
    console.error("[ActivityLog] Failed to write log:", err.message);
  }
}

/**
 * Extract IP address from Express request object.
 */
export function getIpAddress(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Build a log context from an authenticated admin user + Express request.
 */
export function buildLogContext(req) {
  return {
    actor: req.user?._id,
    actorName: req.user?.name,
    actorEmail: req.user?.email,
    ipAddress: getIpAddress(req),
    userAgent: req.headers["user-agent"]?.slice(0, 500) ?? "",
  };
}
