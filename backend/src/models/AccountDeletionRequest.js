import mongoose from "mongoose";

export const ACCOUNT_DELETION_REQUEST_STATUSES = [
    "pending",
    "approved",
    "rejected",
    "cancelled",
];

const accountDeletionRequestSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ACCOUNT_DELETION_REQUEST_STATUSES,
            default: "pending",
            required: true,
            index: true,
        },
        reason: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },
        requestedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
        reviewedAt: Date,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        adminNote: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },
        cancelledAt: Date,
    },
    { timestamps: true },
);

accountDeletionRequestSchema.index(
    { tenant: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "pending" },
    },
);
accountDeletionRequestSchema.index({ status: 1, requestedAt: -1 });

export const AccountDeletionRequest =
    mongoose.models.AccountDeletionRequest ||
    mongoose.model("AccountDeletionRequest", accountDeletionRequestSchema);
