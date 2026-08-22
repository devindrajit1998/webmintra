import mongoose from "mongoose";

const websitePluginSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    website: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true,
    },
    pluginSlug: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    installedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

websitePluginSchema.index({ website: 1, pluginSlug: 1 }, { unique: true });

export const WebsitePlugin = mongoose.model("WebsitePlugin", websitePluginSchema);
