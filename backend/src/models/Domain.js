import mongoose from "mongoose";

export const DOMAIN_STATUSES = [
  "pending_verification",
  "active",
  "expired",
  "suspended",
  "failed",
  "removed",
];

export const SSL_STATUSES = ["pending", "active", "expired", "failed", "none"];

const dnsRecordSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, maxlength: 10 },
    name: { type: String, trim: true, maxlength: 255 },
    value: { type: String, trim: true, maxlength: 500 },
    ttl: { type: Number, default: 3600 },
    verified: { type: Boolean, default: false },
  },
  { _id: false },
);

const domainSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    website: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      index: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 253,
      index: true,
    },
    isSubdomain: { type: Boolean, default: false },
    isPrimary: { type: Boolean, default: false },
    status: {
      type: String,
      enum: DOMAIN_STATUSES,
      default: "pending_verification",
      index: true,
    },
    sslStatus: { type: String, enum: SSL_STATUSES, default: "none" },
    sslExpiresAt: { type: Date },
    verificationToken: { type: String, trim: true, maxlength: 200 },
    verifiedAt: { type: Date },
    expiresAt: { type: Date },
    autoRenew: { type: Boolean, default: true },
    dnsRecords: { type: [dnsRecordSchema], default: [] },
    lastCheckedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    registrar: { type: String, trim: true, maxlength: 120, default: "" },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

domainSchema.index({ domain: 1, status: 1 });

export const Domain = mongoose.model("Domain", domainSchema);
