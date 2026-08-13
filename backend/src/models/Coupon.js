import mongoose from "mongoose";

export const COUPON_TYPES = ["percent", "flat"];
export const COUPON_STATUSES = ["active", "expired", "disabled"];

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    discountType: { type: String, enum: COUPON_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    minimumAmount: { type: Number, default: 0, min: 0 },
    applicablePlans: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plan" }],
    applicableIntervals: [{ type: String, enum: ["monthly", "yearly"] }],
    status: { type: String, enum: COUPON_STATUSES, default: "active", index: true },
    expiresAt: { type: Date },
    validFrom: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

couponSchema.methods.isValid = function (planId = null, interval = null) {
  if (this.status !== "active") return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.validFrom && this.validFrom > new Date()) return false;
  if (this.maxUses !== null && this.usedCount >= this.maxUses) return false;
  
  if (planId && this.applicablePlans && this.applicablePlans.length > 0) {
    if (!this.applicablePlans.some(p => p.toString() === planId.toString())) return false;
  }
  
  if (interval && this.applicableIntervals && this.applicableIntervals.length > 0) {
    if (!this.applicableIntervals.includes(interval)) return false;
  }
  
  return true;
};

export const Coupon = mongoose.model("Coupon", couponSchema);
