import mongoose from "mongoose";

export const WHATSAPP_CONNECTION_STATUSES = [
  "DISCONNECTED",
  "CONNECTING",
  "QR_READY",
  "CONNECTED",
  "RECONNECTING",
  "LOGGED_OUT",
  "ERROR",
];

const tenantWhatsAppSettingsSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    connectionStatus: {
      type: String,
      enum: WHATSAPP_CONNECTION_STATUSES,
      default: "DISCONNECTED",
      index: true,
    },
    isConnected: {
      type: Boolean,
      default: false,
      index: true,
    },
    connectedPhone: {
      type: String,
      trim: true,
      default: "",
    },
    connectedPushName: {
      type: String,
      trim: true,
      default: "",
    },
    lastConnectedAt: {
      type: Date,
    },
    lastDisconnectedAt: {
      type: Date,
    },
    autoReplyEnabled: {
      type: Boolean,
      default: true,
    },
    autoReplyTemplate: {
      type: String,
      trim: true,
      default: "Hi {{name}}, thank you for contacting {{businessName}}! We have received your enquiry and will get back to you shortly.",
      maxlength: 1000,
    },
    leadAlertEnabled: {
      type: Boolean,
      default: true,
    },
    leadAlertPhone: {
      type: String,
      trim: true,
      default: "",
    },
    dailyMessageCount: {
      type: Number,
      default: 0,
    },
    dailyMessageCountResetAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const TenantWhatsAppSettings = mongoose.model(
  "TenantWhatsAppSettings",
  tenantWhatsAppSettingsSchema
);
