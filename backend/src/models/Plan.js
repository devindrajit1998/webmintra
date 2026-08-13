import mongoose from "mongoose";
import { seoFeatureSchema } from "../lib/seo-plan-features.js";

export const PLAN_INTERVALS = ["monthly", "yearly", "lifetime", "free_trial"];
export const PLAN_STATUSES = ["active", "archived"];

const featureSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80, unique: true },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    pricing: {
      monthly: { type: Number, min: 0 },
      yearly: { type: Number, min: 0 },
    },
    status: { type: String, enum: PLAN_STATUSES, default: "active" },
    currency: { type: String, default: "INR", maxlength: 3, uppercase: true },
    trialDays: { type: Number, default: 0, min: 0, max: 365 },

    limits: {
      // Website & page caps
      websites: { type: Number, default: 1, min: 0 },        // 0 = unlimited
      pagesPerWebsite: { type: Number, default: 5, min: 0 }, // 0 = unlimited

      // Domains
      customDomains: { type: Number, default: 0, min: 0 },   // 0 = not allowed

      // Storage & bandwidth
      storageMb: { type: Number, default: 500, min: 0 },     // 0 = unlimited
      bandwidthGb: { type: Number, default: 10, min: 0 },    // 0 = unlimited

      // Collaboration
      collaborators: { type: Number, default: 1, min: 0 },   // 0 = unlimited

      // Communication
      emailsPerMonth: { type: Number, default: 0, min: 0 },  // 0 = disabled

      // AI
      aiCreditsPerMonth: { type: Number, default: 0, min: 0 }, // 0 = disabled
    },

    // Feature toggles (boolean capabilities)
    features: {
      customDomain: { type: Boolean, default: false },
      removeBranding: { type: Boolean, default: false },    // white-label
      apiAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      seoTools: { type: Boolean, default: false },
      formSubmissions: { type: Boolean, default: true },
      passwordProtectedPages: { type: Boolean, default: false },
    },

    // Granular SEO entitlements. Missing keys inherit the canonical defaults for the plan slug.
    seoFeatures: { type: seoFeatureSchema, default: () => ({}) },

    // For pricing page display (ordered bullet points)
    highlights: { type: [String], default: [] },

    sortOrder: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

planSchema.index({ status: 1, sortOrder: 1 });

export const Plan = mongoose.model("Plan", planSchema);
