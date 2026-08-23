import mongoose from "mongoose";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "demo_scheduled",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

export const LEAD_PRIORITIES = ["low", "medium", "high", "urgent"];

export const LEAD_SOURCES = [
  "manual",
  "excel_import",
  "landing_page",
  "referral",
  "google_ads",
  "meta_ads",
  "cold_outreach",
  "whatsapp",
  "other",
];

const leadNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    authorName: { type: String, default: "Admin" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    businessName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, index: true, default: "" },
    email: { type: String, trim: true, lowercase: true, index: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" }, // Full physical address
    website: { type: String, trim: true, default: "" }, // Existing website URL (if any)
    mapUrl: { type: String, trim: true, default: "" },  // Google Maps / GMB URL
    category: { type: String, trim: true, default: "General" }, // Type / Category / Industry (Retail, Clinic, Gym, etc.)
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "new",
      index: true,
    },
    priority: {
      type: String,
      enum: LEAD_PRIORITIES,
      default: "medium",
      index: true,
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      default: "manual",
      index: true,
    },
    estimatedValue: { type: Number, min: 0, default: 0 }, // in INR ₹
    followUpDate: { type: Date, default: null },
    tags: [{ type: String, trim: true }],
    notes: [leadNoteSchema],

    // Link if converted to a tenant
    convertedTenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    convertedAt: { type: Date, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

leadSchema.index({ name: "text", businessName: "text", phone: "text", email: "text", city: "text" });

export const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
