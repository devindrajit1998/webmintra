import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 100, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    group: { type: String, trim: true, maxlength: 80, default: "general", index: true },
    label: { type: String, trim: true, maxlength: 120, default: "" },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    type: {
      type: String,
      enum: ["string", "number", "boolean", "json", "array", "image"],
      default: "string",
    },
    isPublic: { type: Boolean, default: false }, // if true, exposed to frontend
    isEncrypted: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Setting = mongoose.model("Setting", settingSchema);

// Default settings seed helper
export const DEFAULT_SETTINGS = [
  // General
  { key: "site.name", value: "WebMintra", group: "general", label: "Platform Name", type: "string", isPublic: true },
  { key: "site.tagline", value: "Build Websites with Ease", group: "general", label: "Tagline", type: "string", isPublic: true },
  { key: "site.supportEmail", value: "support@webmintra.com", group: "general", label: "Support Email", type: "string" },
  { key: "site.timezone", value: "UTC", group: "general", label: "Default Timezone", type: "string" },
  { key: "site.currency", value: "INR", group: "general", label: "Default Currency", type: "string", isPublic: true },
  { key: "site.language", value: "en", group: "general", label: "Default Language", type: "string", isPublic: true },
  { key: "site.maintenanceMode", value: false, group: "general", label: "Maintenance Mode", type: "boolean" },
  { key: "site.maintenanceMessage", value: "We are currently undergoing maintenance. Please check back soon.", group: "general", label: "Maintenance Message", type: "string", isPublic: true },
  // Branding
  { key: "brand.logoUrl", value: "", group: "branding", label: "Logo URL", type: "image", isPublic: true },
  { key: "brand.faviconUrl", value: "", group: "branding", label: "Favicon URL", type: "image", isPublic: true },
  { key: "brand.primaryColor", value: "#6366f1", group: "branding", label: "Primary Color", type: "string", isPublic: true },
  { key: "brand.company", value: "", group: "branding", label: "Company Name", type: "string", isPublic: true },
  // Storage
  { key: "storage.provider", value: "local", group: "storage", label: "Storage Provider", type: "string" },
  { key: "storage.maxFileSizeMb", value: 50, group: "storage", label: "Max File Size (MB)", type: "number" },
  // Landing page SEO
  { key: "seo.defaultTitle", value: "WebMintra - Build Websites with Ease", group: "seo", label: "Search title", description: "The landing page title shown in search results and browser tabs.", type: "string", isPublic: true },
  { key: "seo.defaultDescription", value: "WebMintra helps businesses build beautiful websites.", group: "seo", label: "Meta description", description: "A concise summary of the landing page for search and social previews.", type: "string", isPublic: true },
  { key: "seo.keywords", value: "website builder, small business website, no-code website builder", group: "seo", label: "Keywords", description: "Comma-separated phrases relevant to the WebMintra landing page.", type: "string", isPublic: true },
  { key: "seo.canonicalUrl", value: "", group: "seo", label: "Canonical URL", description: "The preferred absolute URL for the landing page.", type: "string", isPublic: true },
  { key: "seo.socialImageUrl", value: "", group: "seo", label: "Social sharing image", description: "Image used when the landing page is shared on social networks.", type: "image", isPublic: true },
  { key: "seo.twitterHandle", value: "", group: "seo", label: "X / Twitter handle", description: "The platform account, including the @ prefix.", type: "string", isPublic: true },
  { key: "seo.locale", value: "en_IN", group: "seo", label: "Content locale", description: "Open Graph locale in language_REGION format.", type: "string", isPublic: true },
  { key: "seo.organizationName", value: "WebMintra", group: "seo", label: "Organization name", description: "Business name included in structured search data.", type: "string", isPublic: true },
  { key: "seo.organizationLogoUrl", value: "", group: "seo", label: "Organization logo", description: "Absolute logo URL included in structured search data.", type: "image", isPublic: true },
  { key: "seo.allowIndexing", value: true, group: "seo", label: "Allow search indexing", description: "Allow search engines to index and follow the landing page.", type: "boolean", isPublic: true },
  // Registration
  { key: "registration.inviteOnly", value: true, group: "registration", label: "Invite Only Registration", type: "boolean" },
  { key: "registration.defaultTrialDays", value: 14, group: "registration", label: "Default Trial Days", type: "number" },
  // Security & reCAPTCHA v3
  { key: "security.recaptchaEnabled", value: false, group: "security", label: "Enable Google reCAPTCHA v3", type: "boolean", isPublic: true },
  { key: "security.recaptchaSiteKey", value: "", group: "security", label: "reCAPTCHA v3 Site Key", type: "string", isPublic: true },
];
