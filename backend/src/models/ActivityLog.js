import mongoose from "mongoose";

export const ACTIVITY_ACTIONS = [
  // Auth
  "admin_login",
  "admin_logout",
  "admin_password_changed",
  // Tenant
  "tenant_invited",
  "tenant_invitation_resent",
  "tenant_invitation_cancelled",
  "tenant_suspended",
  "tenant_activated",
  "tenant_archived",
  "tenant_deleted",
  "account_deletion_requested",
  "account_deletion_cancelled",
  "account_deletion_approved",
  "account_deletion_rejected",
  // Subscription
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  // Payment
  "payment_created",
  "payment_updated",
  "payment_refunded",
  // Website
  "website_suspended",
  "website_archived",
  "website_deleted",
  // Domain
  "domain_added",
  "domain_removed",
  "domain_verified",
  // Plan
  "plan_created",
  "plan_updated",
  "plan_deleted",
  // Blog
  "blog_post_published",
  "blog_post_deleted",
  // KB
  "kb_article_published",
  "kb_article_deleted",
  // Support
  "ticket_created",
  "ticket_replied",
  "ticket_resolved",
  "ticket_closed",
  "ticket_assigned",
  // Settings
  "settings_updated",
  // Announcement
  "announcement_published",
  "announcement_deleted",
  // General
  "bulk_action",
  "export_generated",
  "admin_created",
];

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorName: { type: String, trim: true, maxlength: 100 },
    actorEmail: { type: String, trim: true, maxlength: 254 },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    resource: {
      type: { type: String, trim: true, maxlength: 80 },
      id: { type: String, trim: true, maxlength: 50 },
      name: { type: String, trim: true, maxlength: 200 },
    },
    changes: { type: mongoose.Schema.Types.Mixed }, // { before: {}, after: {} }
    ipAddress: { type: String, trim: true, maxlength: 45 },
    userAgent: { type: String, trim: true, maxlength: 500, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

// Shorter alias for audit trail
export const AuditLog = ActivityLog;
