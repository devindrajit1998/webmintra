import mongoose from "mongoose";

const formSubmissionSchema = new mongoose.Schema(
  {
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    source: {
      type: String,
      default: "public_site",
    },
    // Normalized contact fields extracted from submission data
    contactPhone: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    contactName: {
      type: String,
      trim: true,
      default: "",
    },
    contactEmail: {
      type: String,
      trim: true,
      default: "",
    },
    // WhatsApp consent & history
    whatsappOptIn: {
      type: Boolean,
      default: true,
    },
    whatsappOptInAt: {
      type: Date,
      default: Date.now,
    },
    whatsappOptOut: {
      type: Boolean,
      default: false,
      index: true,
    },
    whatsappOptOutAt: {
      type: Date,
    },
    lastWhatsAppContactAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const FormSubmission = mongoose.models.FormSubmission || mongoose.model("FormSubmission", formSubmissionSchema);
