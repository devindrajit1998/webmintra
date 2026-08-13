import mongoose from "mongoose";

export const PAYMENT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "disputed",
];

export const PAYMENT_METHODS = [
  "card",
  "bank_transfer",
  "paypal",
  "crypto",
  "manual",
  "free",
];

const taxSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80 },
    rate: { type: Number, min: 0, max: 100 },
    amount: { type: Number, min: 0 },
    country: { type: String, trim: true, maxlength: 2, uppercase: true },
  },
  { _id: false },
);

const refundSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0, required: true },
    reason: { type: String, trim: true, maxlength: 500, default: "" },
    refundedAt: { type: Date, required: true },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    externalRefundId: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", maxlength: 3, uppercase: true },
    subtotal: { type: Number, min: 0, default: 0 },
    discountAmount: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },
    method: { type: String, enum: PAYMENT_METHODS, default: "manual" },
    externalTransactionId: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    taxes: { type: [taxSchema], default: [] },
    refunds: { type: [refundSchema], default: [] },
    paidAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String, trim: true, maxlength: 500, default: "" },
    dueDate: { type: Date },
    billingAddress: {
      name: { type: String, trim: true, maxlength: 120, default: "" },
      line1: { type: String, trim: true, maxlength: 200, default: "" },
      city: { type: String, trim: true, maxlength: 80, default: "" },
      state: { type: String, trim: true, maxlength: 80, default: "" },
      postalCode: { type: String, trim: true, maxlength: 20, default: "" },
      country: { type: String, trim: true, maxlength: 2, uppercase: true, default: "" },
    },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

paymentSchema.index({ tenant: 1, status: 1, createdAt: -1 });
paymentSchema.index({ createdAt: -1 });

// Auto-generate invoice number
paymentSchema.pre("validate", async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export const Payment = mongoose.model("Payment", paymentSchema);
