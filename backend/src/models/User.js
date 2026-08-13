import mongoose from "mongoose";

export const USER_ROLES = ["admin", "tenant"];

const verificationSchema = new mongoose.Schema(
  {
    codeHash: { type: String },
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "tenant", required: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerification: { type: verificationSchema, default: () => ({}) },
    passwordReset: { type: verificationSchema, default: () => ({}) },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    avatarUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    isPhoneVerified: { type: Boolean, default: false },
    phoneVerification: { type: verificationSchema, default: () => ({}) },
    business: {
      name: { type: String, trim: true, maxlength: 120, default: "" },
      logoUrl: { type: String, trim: true, maxlength: 2048, default: "" },
      faviconUrl: { type: String, trim: true, maxlength: 2048, default: "" },
      address: { type: String, trim: true, maxlength: 300, default: "" },
      email: { type: String, trim: true, maxlength: 254, default: "" },
      phone: { type: String, trim: true, maxlength: 20, default: "" },
      description: { type: String, trim: true, maxlength: 500, default: "" },
    },
    plan: { type: String, enum: ["starter", "growth", "pro"], default: "starter" },
    onboardingCompletedAt: { type: Date },
    invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "Invitation" },
    tenantStatus: { type: String, enum: ["invitation-sent", "active", "suspended", "archived"], default: "active" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
