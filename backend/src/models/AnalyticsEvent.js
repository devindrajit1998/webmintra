import mongoose from "mongoose";

export const ANALYTICS_EVENT_TYPES = ["page_view", "conversion"];

const analyticsEventSchema = new mongoose.Schema(
    {
        website: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Website",
            required: true,
            index: true,
        },
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ANALYTICS_EVENT_TYPES,
            required: true,
        },
        visitorId: {
            type: String,
            required: true,
            maxlength: 100,
        },
        path: {
            type: String,
            default: "/",
            maxlength: 500,
        },
        referrerHost: {
            type: String,
            default: "",
            maxlength: 255,
        },
        occurredAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
    },
    { timestamps: true },
);

analyticsEventSchema.index({ tenant: 1, occurredAt: -1 });
analyticsEventSchema.index({ website: 1, occurredAt: -1 });
analyticsEventSchema.index({ website: 1, visitorId: 1, occurredAt: -1 });
// Keep raw events for 13 months; aggregated reporting remains bounded and privacy-conscious.
analyticsEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 34_214_400 });

export const AnalyticsEvent =
    mongoose.models.AnalyticsEvent || mongoose.model("AnalyticsEvent", analyticsEventSchema);
