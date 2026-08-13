import mongoose from "mongoose";

export const INVITATION_STATUSES = ["pending", "accepted", "expired", "cancelled"];
export const TENANT_STATUSES = ["invitation-sent", "active", "suspended", "archived"];

const invitationSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true, maxlength: 120 },
    ownerName: { type: String, required: true, trim: true, maxlength: 100 },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, index: true },
    plan: { type: String, enum: ["starter", "growth", "pro"], required: true },
    trialDays: { type: Number, min: 0, max: 365, default: 0 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    tokenHash: { type: String, required: true, select: false },
    status: { type: String, enum: INVITATION_STATUSES, default: "pending", index: true },
    expiresAt: { type: Date, required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date },
    acceptedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

invitationSchema.index({ ownerEmail: 1, status: 1 });

export const Invitation = mongoose.model("Invitation", invitationSchema);
