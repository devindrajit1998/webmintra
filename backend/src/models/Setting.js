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
      enum: ["string", "number", "boolean", "json", "array", "image", "html"],
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
  { key: "site.supportEmail", value: "support@webmintra.in", group: "general", label: "Support Email", type: "string" },
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
  // Public legal content
  {
    key: "content.privacyPolicy",
    value: `<h2>1. Overview</h2><p>WebMintra (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;platform&rdquo;) values your privacy and is committed to protecting the personal data of our users, website owners, and their visitors. This Privacy Policy describes how we collect, use, and share your information when you use our SaaS website building and hosting services.</p><h2>2. Information We Collect</h2><p>We collect information necessary to provide and secure our services, including:</p><ul><li><strong>Account Data:</strong> Name, business name, email address, phone number, and password credentials.</li><li><strong>Website Content:</strong> Text, images, logos, business hours, and pricing lists uploaded to your created sites.</li><li><strong>Lead & Form Submissions:</strong> Enquiries submitted by visitors on your published websites are stored securely for your access and routed to WhatsApp.</li><li><strong>Billing Data:</strong> Transaction references and subscription IDs processed through RBI-approved Indian payment gateways (e.g. Razorpay, UPI). We never store raw card numbers.</li></ul><h2>3. How We Use Your Data</h2><p>Your information is used exclusively to:</p><ul><li>Host and deliver high-speed, secure websites with automatic SSL certification.</li><li>Notify you immediately when prospective customers submit contact and booking requests.</li><li>Provide customer support, GST invoices, onboarding assistance, and service updates.</li></ul><h2>4. Data Ownership & Security</h2><p>You retain 100% ownership of your business content, images, and visitor lead submissions. All data in transit is encrypted using 256-bit SSL/TLS encryption and stored on secure Indian cloud infrastructure.</p><h2>5. Contact Information</h2><p>For questions regarding this policy or data deletion requests, email our data protection officer at <a href="mailto:support@webmintra.in">support@webmintra.in</a>.</p>`,
    group: "content",
    label: "Privacy Policy",
    description: "Rich content displayed on the public Privacy Policy page.",
    type: "html",
    isPublic: true,
  },
  {
    key: "content.termsAndConditions",
    value: `<h2>1. Acceptance of Terms</h2><p>By creating an account or accessing the WebMintra platform, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.</p><h2>2. Platform Subscription & Service Use</h2><p>WebMintra provides website building software, cloud edge hosting, template libraries, WhatsApp form processing, and custom .in / .com domain connection services. You agree to use the service only for lawful business operations and represent that you have the right to publish all content you upload.</p><h2>3. Intellectual Property Rights</h2><p>You retain all rights, title, and interest in your own text, business logos, product catalogs, and trademarked materials. WebMintra retains all rights to the underlying software engine, builder code, template architectures, and platform infrastructure.</p><h2>4. Prohibited Content</h2><p>Users may not publish websites involving illegal goods, deceptive financial schemes, malware, spam, or copyright-infringing media.</p><h2>5. Service Availability & Uptime</h2><p>We strive for 99.9% uptime on managed cloud infrastructure hosted across Indian edge nodes. Scheduled maintenance windows will be communicated via the platform announcements dashboard.</p><h2>6. Inquiries</h2><p>Questions regarding platform terms can be directed to <a href="mailto:support@webmintra.in">support@webmintra.in</a>.</p>`,
    group: "content",
    label: "Terms and Conditions",
    description: "Rich content displayed on the public Terms and Conditions page.",
    type: "html",
    isPublic: true,
  },
  {
    key: "content.refundCancellationPolicy",
    value: `<h2>1. 14-Day Free Trial</h2><p>Every new WebMintra business workspace includes an unrestricted 14-day free trial. No credit card or upfront payment is required to begin building, customizing templates, and testing your website.</p><h2>2. Subscription Cancellation</h2><p>You may cancel your monthly or annual subscription at any time directly from your <strong>Tenant Workspace &rarr; Billing</strong> dashboard. Upon cancellation:</p><ul><li>Your website remains active until the end of the current paid billing period.</li><li>No further automatic recurring charges will be initiated.</li><li>Your website data and uploaded media are preserved safely for 60 days in case you wish to reactivate.</li></ul><h2>3. Refund Terms</h2><p>If you encounter technical issues that prevent your website from functioning as advertised and our support team is unable to resolve it within 7 business days, you are eligible for a full refund of your most recent subscription cycle.</p><h2>4. Refund Processing Time</h2><p>Approved refunds are credited back to the original Indian payment method (UPI, Bank Account, NetBanking, Debit/Credit Card) within 5 to 7 business days via our RBI-authorized payment partner.</p><h2>5. How to Request Support</h2><p>To request a billing review or refund, email our accounts team at <a href="mailto:support@webmintra.in">support@webmintra.in</a> with your registered workspace email and GST invoice number.</p>`,
    group: "content",
    label: "Refund & Cancellation Policy",
    description: "Rich content displayed on the public Refund & Cancellation Policy page.",
    type: "html",
    isPublic: true,
  },
  // Registration
  { key: "registration.inviteOnly", value: true, group: "registration", label: "Invite Only Registration", type: "boolean" },
  { key: "registration.defaultTrialDays", value: 14, group: "registration", label: "Default Trial Days", type: "number" },
  // Security & reCAPTCHA v3
  { key: "security.recaptchaEnabled", value: false, group: "security", label: "Enable Google reCAPTCHA v3", type: "boolean", isPublic: true },
  { key: "security.recaptchaSiteKey", value: "", group: "security", label: "reCAPTCHA v3 Site Key", type: "string", isPublic: true },
];
