import mongoose from "mongoose";

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
  "paused",
];

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, uppercase: true, maxlength: 50 },
    discountType: { type: String, enum: ["percent", "flat"], default: "percent" },
    discountValue: { type: Number, min: 0 },
    appliedAt: { type: Date },
  },
  { _id: false },
);

const subscriptionSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planSnapshot: {
      name: { type: String },
      interval: { type: String },
      price: { type: Number },
      currency: { type: String },
      limits: { type: mongoose.Schema.Types.Mixed },
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "active",
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, index: true },
    trialEndsAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: "" },
    autoRenew: { type: Boolean, default: true },
    coupon: { type: couponSchema },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    limits: {
      websites: { type: Number, default: 1 },
      storageMb: { type: Number, default: 500 },
      bandwidthGb: { type: Number, default: 10 },
      customDomains: { type: Number, default: 1 },
      collaborators: { type: Number, default: 1 },
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ tenant: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
