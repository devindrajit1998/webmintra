import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getPlans, createPlan, updatePlan, deletePlan } from "@/lib/admin-api";
import {
  Loader2,
  Plus,
  Edit,
  Check,
  X,
  Globe,
  Database,
  Users,
  Zap,
  Mail,
  BarChart2,
  Search,
  ShieldCheck,
  FileText,
  Sparkles,
  ChevronRight,
  Archive,
  Eye,
  EyeOff,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/plans")({
  component: PlansPage,
});

// ── Options for dropdowns (no manual typing) ──
const WEBSITE_OPTIONS = [1, 2, 3, 5, 10, 25, 50, 100, 0] as const; // 0 = unlimited
const PAGES_OPTIONS = [1, 2, 3, 5, 10, 25, 50, 100, 0] as const;
const DOMAINS_OPTIONS = [1, 2, 5, 10, 0] as const;
const STORAGE_OPTIONS = [100, 250, 500, 1000, 2000, 5000, 10000, 0] as const; // MB, 0=unlimited
const BANDWIDTH_OPTIONS = [1, 5, 10, 25, 50, 100, 0] as const; // GB, 0=unlimited
const COLLAB_OPTIONS = [1, 2, 3, 5, 10, 0] as const;
const EMAIL_OPTIONS = [100, 500, 1000, 5000, 10000, 0] as const;
const AI_OPTIONS = [50, 100, 500, 1000, 0] as const;
const TRIAL_OPTIONS = [0, 7, 14, 30] as const;
const PRICE_OPTIONS = [0, 99, 199, 299, 499, 799, 999, 1499, 1999, 2999] as const;
const INTERVALS = ["monthly", "yearly", "lifetime", "free_trial"] as const;

function fmt(val: number, unit: string) {
  if (val === 0) return `Unlimited`;
  return `${val.toLocaleString()} ${unit}`;
}

const DEFAULT_LIMITS = {
  websites: 1,
  pagesPerWebsite: 5,
  customDomains: 0,
  storageMb: 500,
  bandwidthGb: 10,
  collaborators: 1,
  emailsPerMonth: 0,
  aiCreditsPerMonth: 0,
};

const DEFAULT_FEATURES = {
  customDomain: false,
  removeBranding: false,
  apiAccess: false,
  prioritySupport: false,
  analytics: false,
  seoTools: false,
  formSubmissions: true,
  passwordProtectedPages: false,
};

const SEO_FEATURES = [
  ["pageTitle", "Page title", "boolean"],
  ["metaDescription", "Meta description", "boolean"],
  ["searchKeywords", "Search keywords", "boolean"],
  ["canonicalUrl", "Canonical URL", "boolean"],
  ["socialTitle", "Social title", "boolean"],
  ["socialDescription", "Social description", "boolean"],
  ["socialImage", "Social image", "boolean"],
  ["twitterCard", "Twitter/X card", "boolean"],
  ["robotsDirective", "Robots directive", ["basic", "custom", "advanced"]],
  ["xmlSitemap", "XML Sitemap", "boolean"],
  ["sitemapCustomization", "Sitemap customization", "boolean"],
  ["schemaJsonLd", "Schema / JSON-LD", ["disabled", "basic_presets", "custom_json_ld"]],
  ["structuredDataPresets", "Structured data presets", "boolean"],
  ["openGraph", "Open Graph", "boolean"],
  ["googleVerification", "Google verification", "boolean"],
  ["searchConsoleIntegration", "Search Console integration", "boolean"],
  ["googleAnalytics", "Google Analytics", "boolean"],
  ["redirects301", "301 redirects", "boolean"],
  ["custom404", "404 page customization", "boolean"],
  ["seoHealthScore", "SEO health score", ["basic", "advanced"]],
  ["seoRecommendations", "SEO recommendations", ["disabled", "enabled", "ai_advanced"]],
  ["imageAltText", "Image alt-text controls", ["basic", "enabled"]],
  ["indexNoIndexPerPage", "Index/no-index per page", "boolean"],
  ["seoSettingsPerPage", "SEO settings per page", ["limited", "enabled"]],
  ["globalSeoSettings", "Global SEO settings", "boolean"],
] as const;
type SeoFeatureKey = (typeof SEO_FEATURES)[number][0];
type SeoFeatures = Record<SeoFeatureKey, boolean | string>;
const DEFAULT_SEO_FEATURES: SeoFeatures = Object.fromEntries(
  SEO_FEATURES.map(([key, , kind]) => [
    key,
    kind === "boolean" ? false : Array.isArray(kind) ? kind[0] : "basic",
  ]),
) as SeoFeatures;
const SEO_GROUPS: Array<{ label: string; keys: SeoFeatureKey[] }> = [
  {
    label: "Metadata",
    keys: [
      "pageTitle",
      "metaDescription",
      "searchKeywords",
      "canonicalUrl",
      "globalSeoSettings",
      "seoSettingsPerPage",
    ],
  },
  {
    label: "Social sharing",
    keys: ["socialTitle", "socialDescription", "socialImage", "twitterCard", "openGraph"],
  },
  {
    label: "Crawling and indexing",
    keys: [
      "robotsDirective",
      "xmlSitemap",
      "sitemapCustomization",
      "indexNoIndexPerPage",
      "redirects301",
      "custom404",
    ],
  },
  { label: "Structured data", keys: ["schemaJsonLd", "structuredDataPresets", "imageAltText"] },
  {
    label: "Google integrations",
    keys: ["googleVerification", "searchConsoleIntegration", "googleAnalytics"],
  },
  { label: "Optimization", keys: ["seoHealthScore", "seoRecommendations"] },
];

type PlanForm = {
  name: string;
  slug: string;
  description: string;
  pricing: { monthly: number | null; yearly: number | null };
  trialDays: number;
  isPublic: boolean;
  sortOrder: number;
  limits: typeof DEFAULT_LIMITS;
  features: typeof DEFAULT_FEATURES;
  seoFeatures: SeoFeatures;
};

const SEO_TIER_FEATURES: Record<"basic" | "advance" | "premium", SeoFeatures> = {
  basic: {
    ...DEFAULT_SEO_FEATURES,
    pageTitle: true,
    metaDescription: true,
    searchKeywords: true,
    globalSeoSettings: true,
    xmlSitemap: true,
    robotsDirective: "basic",
    seoHealthScore: "basic",
    seoSettingsPerPage: "limited",
  },
  advance: {
    ...DEFAULT_SEO_FEATURES,
    // Basic features
    pageTitle: true,
    metaDescription: true,
    searchKeywords: true,
    globalSeoSettings: true,
    xmlSitemap: true,
    // Advance features
    canonicalUrl: true,
    socialTitle: true,
    socialDescription: true,
    socialImage: true,
    twitterCard: true,
    openGraph: true,
    robotsDirective: "custom",
    schemaJsonLd: "basic_presets",
    structuredDataPresets: true,
    googleVerification: true,
    googleAnalytics: true,
    redirects301: true,
    seoHealthScore: "advanced",
    seoRecommendations: "enabled",
    imageAltText: "enabled",
    indexNoIndexPerPage: true,
    seoSettingsPerPage: "enabled",
  },
  premium: {
    ...DEFAULT_SEO_FEATURES,
    // Basic + Advance features
    pageTitle: true,
    metaDescription: true,
    searchKeywords: true,
    globalSeoSettings: true,
    xmlSitemap: true,
    canonicalUrl: true,
    socialTitle: true,
    socialDescription: true,
    socialImage: true,
    twitterCard: true,
    openGraph: true,
    robotsDirective: "advanced",
    schemaJsonLd: "custom_json_ld",
    structuredDataPresets: true,
    googleVerification: true,
    googleAnalytics: true,
    redirects301: true,
    seoHealthScore: "advanced",
    seoRecommendations: "ai_advanced",
    imageAltText: "enabled",
    indexNoIndexPerPage: true,
    seoSettingsPerPage: "enabled",
    // Premium specific
    sitemapCustomization: true,
    searchConsoleIntegration: true,
    custom404: true,
  },
};

type SeoTier = "basic" | "advance" | "premium" | "custom";

function detectSeoTier(seoFeatures: SeoFeatures): SeoTier {
  const isPremium =
    seoFeatures.sitemapCustomization === true &&
    seoFeatures.searchConsoleIntegration === true &&
    seoFeatures.custom404 === true &&
    seoFeatures.schemaJsonLd === "custom_json_ld" &&
    seoFeatures.seoRecommendations === "ai_advanced";
  if (isPremium) return "premium";

  const isAdvance =
    seoFeatures.canonicalUrl === true &&
    seoFeatures.socialTitle === true &&
    seoFeatures.openGraph === true &&
    seoFeatures.googleVerification === true &&
    seoFeatures.redirects301 === true;
  if (isAdvance) return "advance";

  return "basic";
}

function makeSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const EMPTY_FORM: PlanForm = {
  name: "",
  slug: "",
  description: "",
  pricing: { monthly: 499, yearly: 4990 },
  trialDays: 0,
  isPublic: true,
  sortOrder: 0,
  limits: { ...DEFAULT_LIMITS },
  features: { ...DEFAULT_FEATURES },
  seoFeatures: { ...SEO_TIER_FEATURES.basic },
};

// ── Sub-components ──────────────────────────────────────────────

function SelectRow({
  label,
  icon: Icon,
  value,
  options,
  unit,
  onChange,
}: {
  label: string;
  icon: any;
  value: number;
  options: readonly number[];
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f1f5f9] last:border-0 gap-3">
      <div className="flex items-center gap-2.5 text-xs font-bold text-[#0f172a]">
        <Icon className="h-4 w-4 text-[#059669] shrink-0" />
        <span>{label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#0f172a] shadow-2xs outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 min-w-[140px] text-right cursor-pointer"
      >
        {options.map((opt, i) => (
          <option key={`${opt}-${i}`} value={opt} className="bg-white text-[#0f172a]">
            {opt === 0 ? "Unlimited / Off" : `${opt.toLocaleString()} ${unit}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  icon: Icon,
  enabled,
  description,
  onChange,
}: {
  label: string;
  icon: any;
  enabled: boolean;
  description?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 cursor-pointer transition shadow-2xs ${
        enabled
          ? "bg-[#ecfdf5] border border-[#a7f3d0]"
          : "bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#cbd5e1]"
      }`}
      onClick={() => onChange(!enabled)}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 shrink-0 ${enabled ? "text-[#059669]" : "text-[#94a3b8]"}`} />
        <div>
          <p className={`text-xs font-bold ${enabled ? "text-[#065f46]" : "text-[#334155]"}`}>
            {label}
          </p>
          {description && <p className="text-[10px] text-[#64748b]">{description}</p>}
        </div>
      </div>
      <div
        className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-[#059669]" : "bg-[#cbd5e1]"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : ""}`}
        />
      </div>
    </div>
  );
}

// ── Plan Card ──────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: any; onEdit: (p: any) => void }) {
  const lim = plan.limits ?? {};
  const feat = plan.features ?? {};
  const isArchived = plan.status === "archived";

  return (
    <article
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all ${isArchived ? "border-slate-200 opacity-60" : "border-slate-200 hover:border-slate-300 hover:shadow-md"}`}
    >
      {/* Header */}
      <div className="flex min-h-[84px] items-start justify-between gap-3 border-b border-slate-200 p-5 pb-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate font-display text-lg font-bold text-slate-950">
              {plan.displayName || (plan.slug === "pro" ? "Business" : plan.name)}
            </h3>
            {plan.isPublic ? (
              <Eye className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-slate-600" />
            )}
          </div>
          <p className="truncate font-mono text-xs text-slate-500">/{plan.slug}</p>
          {plan.description && (
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">{plan.description}</p>
          )}
        </div>
        <span
          className={`ml-2 shrink-0 rounded-full px-2 py-1 text-[10px] font-medium capitalize ${plan.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"}`}
        >
          {plan.status}
        </span>
      </div>

      {/* Pricing */}
      <div className="min-h-[84px] border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {plan.pricing?.monthly !== null && (
            <div>
              <p className="font-display text-2xl font-bold text-slate-950">
                ₹{Number(plan.pricing?.monthly ?? 0).toLocaleString("en-IN")}
                <span className="ml-1 text-xs font-normal text-slate-500">/mo</span>
              </p>
            </div>
          )}
          {plan.pricing?.yearly !== null && (
            <div>
              <p className="font-display text-2xl font-bold text-slate-950">
                ₹{Number(plan.pricing?.yearly ?? 0).toLocaleString("en-IN")}
                <span className="ml-1 text-xs font-normal text-slate-500">/yr</span>
              </p>
            </div>
          )}
          {plan.pricing?.monthly === null && plan.pricing?.yearly === null && (
            <p className="font-display text-2xl font-bold text-slate-400">Free</p>
          )}
        </div>
        {plan.trialDays > 0 && (
          <p className="mt-1 text-xs text-cyan-400">{plan.trialDays}-day free trial</p>
        )}
      </div>

      {/* Limits */}
      <div className="flex-1 space-y-2 border-b border-slate-200 px-5 py-4">
        <LimitBadge icon={Globe} label={`${fmt(lim.websites, "Websites")}`} />
        <LimitBadge icon={FileText} label={`${fmt(lim.pagesPerWebsite, "Pages/site")}`} />
        <LimitBadge icon={Database} label={`${fmt(lim.storageMb, "MB Storage")}`} />
        <LimitBadge icon={Wifi} label={`${fmt(lim.bandwidthGb, "GB Bandwidth")}`} />
        <LimitBadge icon={Users} label={`${fmt(lim.collaborators, "Collaborators")}`} />
        {lim.emailsPerMonth > 0 && (
          <LimitBadge icon={Mail} label={`${fmt(lim.emailsPerMonth, "Emails/mo")}`} />
        )}
        {lim.aiCreditsPerMonth > 0 && (
          <LimitBadge icon={Sparkles} label={`${fmt(lim.aiCreditsPerMonth, "AI Credits/mo")}`} />
        )}
      </div>

      {/* Feature badges */}
      <div className="flex min-h-[62px] flex-wrap content-start gap-1.5 border-b border-slate-200 px-5 py-3">
        {feat.customDomain && <FeatureBadge label="Custom Domains" />}
        {feat.removeBranding && <FeatureBadge label="White Label" />}
        {feat.apiAccess && <FeatureBadge label="API Access" />}
        {feat.analytics && <FeatureBadge label="Analytics" />}
        {feat.seoTools && <FeatureBadge label="SEO Tools" />}
        {feat.prioritySupport && <FeatureBadge label="Priority Support" />}
        {feat.passwordProtectedPages && <FeatureBadge label="Protected Pages" />}
        {feat.formSubmissions && <FeatureBadge label="Form Submissions" color="blue" />}
      </div>

      {/* Footer */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => onEdit(plan)}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <Edit className="h-4 w-4" /> Edit Plan
        </button>
      </div>
    </article>
  );
}

function LimitBadge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span>{label}</span>
    </div>
  );
}

function FeatureBadge({ label, color = "emerald" }: { label: string; color?: "emerald" | "blue" }) {
  const cls =
    color === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ── Plan Form Drawer ───────────────────────────────────────────

function PlanFormDrawer({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PlanForm & { _id?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState<PlanForm>(
    initial
      ? {
          name: initial.name,
          slug: initial.slug,
          description: initial.description ?? "",
          pricing: {
            monthly: initial.pricing?.monthly ?? 499,
            yearly: initial.pricing?.yearly ?? 4990,
          },
          trialDays: initial.trialDays ?? 0,
          isPublic: initial.isPublic ?? true,
          sortOrder: initial.sortOrder ?? 0,
          limits: { ...DEFAULT_LIMITS, ...initial.limits },
          features: { ...DEFAULT_FEATURES, ...initial.features },
          seoFeatures: { ...DEFAULT_SEO_FEATURES, ...initial.seoFeatures },
        }
      : { ...EMPTY_FORM },
  );

  const [seoTier, setSeoTier] = useState<SeoTier>(() =>
    initial ? detectSeoTier({ ...DEFAULT_SEO_FEATURES, ...initial.seoFeatures }) : "basic",
  );
  const [showDetailedSeo, setShowDetailedSeo] = useState(false);
  const [seoSearch, setSeoSearch] = useState("");

  const setTier = (tier: "basic" | "advance" | "premium") => {
    setSeoTier(tier);
    setForm((f) => ({ ...f, seoFeatures: { ...SEO_TIER_FEATURES[tier] } }));
  };

  const setLim = (k: keyof typeof DEFAULT_LIMITS) => (v: number) =>
    setForm((f) => ({ ...f, limits: { ...f.limits, [k]: v } }));
  const setFeat = (k: keyof typeof DEFAULT_FEATURES) => (v: boolean) =>
    setForm((f) => ({ ...f, features: { ...f.features, [k]: v } }));
  const setSeo = (k: SeoFeatureKey, v: boolean | string) =>
    setForm((f) => ({ ...f, seoFeatures: { ...f.seoFeatures, [k]: v } }));

  const createMutation = useMutation({
    mutationFn: (data: any) => (isEdit ? updatePlan(initial!._id!, data) : createPlan(data)),
    onSuccess: () => {
      toast.success(isEdit ? "Plan updated!" : "Plan created!");
      onSaved();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: () => deletePlan(initial!._id!),
    onSuccess: () => {
      toast.success("Plan archived");
      onSaved();
    },
    onError: (err: any) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.slug.trim()) return toast.error("Slug is required");
    createMutation.mutate(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 flex h-screen w-full max-w-[540px] flex-col border-l border-[#e2e8f0] bg-white shadow-2xl overflow-hidden text-[#0f172a]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4 bg-[#f8fafc] shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0f172a]">
              {isEdit ? "Edit Plan" : "Create New Plan"}
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5 font-medium">
              {isEdit
                ? `Editing "${initial?.slug === "pro" ? "Business" : initial?.name}"`
                : "Configure all plan limits and features."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Form */}
        <form
          id="plan-drawer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6"
        >
          {/* Basic Info */}
          <section>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-bold text-[#ea580c] shadow-2xs mb-3">
              <Sparkles className="h-3 w-3" /> Basic Info
            </span>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#0f172a]">Plan Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: makeSlug(e.target.value),
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-xs font-semibold text-[#0f172a] shadow-xs outline-none transition focus:border-[#059669] focus:ring-3 focus:ring-[#059669]/15 placeholder:text-[#94a3b8]"
                  placeholder="e.g. Starter, Growth, Business"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0f172a]">
                  URL Slug (auto-generated)
                </label>
                <div className="mt-1.5 flex h-10 items-center rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 shadow-xs">
                  <span className="text-[#94a3b8] text-xs mr-1 font-mono font-bold">/</span>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    className="flex-1 bg-transparent text-xs font-mono font-semibold text-[#0f172a] outline-none"
                    placeholder="growth"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#0f172a]">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2 text-xs font-medium text-[#0f172a] shadow-xs outline-none transition focus:border-[#059669] focus:ring-3 focus:ring-[#059669]/15 resize-none placeholder:text-[#94a3b8]"
                  placeholder="Short description shown on pricing page..."
                />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-bold text-[#ea580c] shadow-2xs mb-3">
              <Sparkles className="h-3 w-3" /> Pricing (INR ₹)
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#0f172a]">Monthly Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.pricing.monthly === null ? "" : form.pricing.monthly}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricing: {
                        ...f.pricing,
                        monthly: e.target.value === "" ? null : Number(e.target.value),
                      },
                    }))
                  }
                  placeholder="0 = Free"
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#0f172a] shadow-xs outline-none transition focus:border-[#059669] focus:ring-3 focus:ring-[#059669]/15"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0f172a]">Yearly Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.pricing.yearly === null ? "" : form.pricing.yearly}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricing: {
                        ...f.pricing,
                        yearly: e.target.value === "" ? null : Number(e.target.value),
                      },
                    }))
                  }
                  placeholder="0 = Free"
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#0f172a] shadow-xs outline-none transition focus:border-[#059669] focus:ring-3 focus:ring-[#059669]/15"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0f172a]">Trial Days</label>
                <select
                  value={form.trialDays}
                  onChange={(e) => setForm((f) => ({ ...f, trialDays: Number(e.target.value) }))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#0f172a] shadow-xs outline-none transition focus:border-[#059669] focus:ring-3 focus:ring-[#059669]/15 cursor-pointer"
                >
                  {TRIAL_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? "No trial" : `${d} days`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              className="mt-3.5 flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 cursor-pointer hover:border-[#cbd5e1] transition"
              onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold">
                {form.isPublic ? (
                  <Eye className="h-4 w-4 text-[#059669]" />
                ) : (
                  <EyeOff className="h-4 w-4 text-[#94a3b8]" />
                )}
                <span className={form.isPublic ? "text-[#059669]" : "text-[#64748b]"}>
                  {form.isPublic
                    ? "Publicly visible on pricing page"
                    : "Hidden — internal use only"}
                </span>
              </div>
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${form.isPublic ? "bg-[#059669]" : "bg-[#cbd5e1]"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isPublic ? "translate-x-4" : ""}`}
                />
              </div>
            </div>
          </section>

          {/* Limits */}
          <section>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-bold text-[#ea580c] shadow-2xs mb-1">
              <Sparkles className="h-3 w-3" /> Usage Limits
            </span>
            <p className="text-[11px] text-[#64748b] mb-3 mt-1">
              "Unlimited / Off" sets the value to 0, which the system treats as unlimited (or
              disabled for emails/AI credits).
            </p>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-1 divide-y divide-[#f1f5f9] shadow-xs">
              <SelectRow
                label="Websites"
                icon={Globe}
                value={form.limits.websites}
                options={WEBSITE_OPTIONS}
                unit="websites"
                onChange={setLim("websites")}
              />
              <SelectRow
                label="Pages per website"
                icon={FileText}
                value={form.limits.pagesPerWebsite}
                options={PAGES_OPTIONS}
                unit="pages"
                onChange={setLim("pagesPerWebsite")}
              />
              <SelectRow
                label="Custom domains"
                icon={Globe}
                value={form.limits.customDomains}
                options={[0, 1, 2, 5, 10]}
                unit="domains"
                onChange={setLim("customDomains")}
              />
              <SelectRow
                label="Storage"
                icon={Database}
                value={form.limits.storageMb}
                options={STORAGE_OPTIONS}
                unit="MB"
                onChange={setLim("storageMb")}
              />
              <SelectRow
                label="Bandwidth"
                icon={Wifi}
                value={form.limits.bandwidthGb}
                options={BANDWIDTH_OPTIONS}
                unit="GB"
                onChange={setLim("bandwidthGb")}
              />
              <SelectRow
                label="Collaborators"
                icon={Users}
                value={form.limits.collaborators}
                options={COLLAB_OPTIONS}
                unit="members"
                onChange={setLim("collaborators")}
              />
              <SelectRow
                label="Emails per month"
                icon={Mail}
                value={form.limits.emailsPerMonth}
                options={EMAIL_OPTIONS}
                unit="emails"
                onChange={setLim("emailsPerMonth")}
              />
              <SelectRow
                label="AI credits / month"
                icon={Sparkles}
                value={form.limits.aiCreditsPerMonth}
                options={AI_OPTIONS}
                unit="credits"
                onChange={setLim("aiCreditsPerMonth")}
              />
            </div>
          </section>

          {/* Platform Features */}
          <section>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-bold text-[#ea580c] shadow-2xs mb-3">
              <Sparkles className="h-3 w-3" /> Core Features
            </span>
            <div className="grid gap-2">
              <ToggleRow
                label="Custom Domains"
                icon={Globe}
                enabled={form.features.customDomain}
                description="Allow tenants to connect their own .in/.com domains"
                onChange={setFeat("customDomain")}
              />
              <ToggleRow
                label="White Label"
                icon={ShieldCheck}
                enabled={form.features.removeBranding}
                description="Remove WebMintra branding from published footer"
                onChange={setFeat("removeBranding")}
              />
              <ToggleRow
                label="Analytics & Insights"
                icon={BarChart2}
                enabled={form.features.analytics}
                description="Visitor tracking, page views & traffic sources"
                onChange={setFeat("analytics")}
              />
              <ToggleRow
                label="SEO Tools Suite"
                icon={Search}
                enabled={form.features.seoTools}
                description="Meta tags, XML sitemaps & Schema validation"
                onChange={setFeat("seoTools")}
              />
              <ToggleRow
                label="Priority 24/7 Support"
                icon={Zap}
                enabled={form.features.prioritySupport}
                description="Priority WhatsApp and email ticket handling"
                onChange={setFeat("prioritySupport")}
              />
              <ToggleRow
                label="Form Submissions"
                icon={Mail}
                enabled={form.features.formSubmissions}
                description="Capture visitor lead forms & instant WhatsApp alerts"
                onChange={setFeat("formSubmissions")}
              />
            </div>
          </section>

          {/* SEO Tier Package */}
          <section>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-bold text-[#ea580c] shadow-2xs mb-1">
              <Sparkles className="h-3 w-3" /> SEO Package Tier
            </span>
            <p className="text-[11px] text-[#64748b] mb-3 mt-1">
              Select the SEO tier for this plan. Higher tiers include all features from lower tiers.
            </p>

            {/* 3 Tier Selection Cards */}
            <div className="grid gap-3">
              {/* Basic SEO */}
              <div
                onClick={() => setTier("basic")}
                className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-2xs ${
                  seoTier === "basic"
                    ? "border-[#059669] bg-[#ecfdf5]/60 ring-2 ring-[#059669]/20 shadow-sm"
                    : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-xl font-bold ${
                        seoTier === "basic"
                          ? "bg-[#059669] text-white"
                          : "bg-[#f1f5f9] text-[#64748b]"
                      }`}
                    >
                      <Search className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0f172a]">Basic SEO</h4>
                      <p className="text-[11px] text-[#64748b]">
                        Essential search engine tags & dynamic XML sitemap
                      </p>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      seoTier === "basic"
                        ? "border-[#059669] bg-[#059669] text-white"
                        : "border-[#cbd5e1]"
                    }`}
                  >
                    {seoTier === "basic" && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-[#e2e8f0]/80 text-[10px]">
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Page Titles & Descriptions
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Keywords
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    XML Sitemap
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Standard Robots.txt
                  </span>
                </div>
              </div>

              {/* Advance SEO */}
              <div
                onClick={() => setTier("advance")}
                className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-2xs ${
                  seoTier === "advance"
                    ? "border-[#059669] bg-[#ecfdf5]/60 ring-2 ring-[#059669]/20 shadow-sm"
                    : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-xl font-bold ${
                        seoTier === "advance"
                          ? "bg-[#059669] text-white"
                          : "bg-[#f1f5f9] text-[#64748b]"
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#0f172a]">Advance SEO</h4>
                        <span className="rounded-full bg-[#dcfce7] border border-[#bbf7d0] px-2 py-0.2 text-[9px] font-bold text-[#15803d]">
                          Basic + Advance
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748b]">
                        Social cards, Google Analytics, 301 redirects & schema presets
                      </p>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      seoTier === "advance"
                        ? "border-[#059669] bg-[#059669] text-white"
                        : "border-[#cbd5e1]"
                    }`}
                  >
                    {seoTier === "advance" && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-[#e2e8f0]/80 text-[10px]">
                  <span className="rounded-md bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 font-bold text-[#047857]">
                    All Basic Features
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Open Graph & Twitter Cards
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Google Analytics & Verification
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    301 Redirects
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Schema Presets
                  </span>
                </div>
              </div>

              {/* Premium SEO */}
              <div
                onClick={() => setTier("premium")}
                className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-2xs ${
                  seoTier === "premium"
                    ? "border-[#ea580c] bg-[#fff7ed] ring-2 ring-[#ea580c]/20 shadow-sm"
                    : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-xl font-bold ${
                        seoTier === "premium"
                          ? "bg-[#ea580c] text-white"
                          : "bg-[#f1f5f9] text-[#64748b]"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#0f172a]">Premium SEO 🇮🇳</h4>
                        <span className="rounded-full bg-[#ffedd5] border border-[#fed7aa] px-2 py-0.2 text-[9px] font-bold text-[#c2410c]">
                          Ultimate AI Suite
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748b]">
                        Custom JSON-LD, Search Console, Custom 404 & AI Recommendations
                      </p>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      seoTier === "premium"
                        ? "border-[#ea580c] bg-[#ea580c] text-white"
                        : "border-[#cbd5e1]"
                    }`}
                  >
                    {seoTier === "premium" && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-[#e2e8f0]/80 text-[10px]">
                  <span className="rounded-md bg-[#fff7ed] border border-[#fed7aa] px-2 py-0.5 font-bold text-[#ea580c]">
                    All Basic + Advance
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Custom JSON-LD
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Search Console Integration
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    Custom 404 Page
                  </span>
                  <span className="rounded-md bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 font-bold text-[#334155]">
                    AI Recommendations
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Advanced Override Accordion */}
            <div className="mt-4 pt-3 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setShowDetailedSeo(!showDetailedSeo)}
                className="flex items-center justify-between w-full text-xs font-bold text-[#475569] hover:text-[#0f172a] transition cursor-pointer"
              >
                <span>Fine-tune individual capabilities ({Object.keys(SEO_FEATURES).length})</span>
                <span className="text-xs text-[#ea580c]">
                  {showDetailedSeo ? "Hide details" : "Customize..."}
                </span>
              </button>

              {showDetailedSeo && (
                <div className="mt-3 space-y-4 pt-3 border-t border-[#e2e8f0]">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      value={seoSearch}
                      onChange={(event) => setSeoSearch(event.target.value)}
                      placeholder="Search SEO capabilities..."
                      className="h-9 w-full rounded-xl border border-[#cbd5e1] bg-white pl-9 pr-3 text-xs font-medium text-[#0f172a] shadow-xs outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                    />
                  </div>
                  {SEO_GROUPS.map((group) => {
                    const features = SEO_FEATURES.filter(
                      ([key, label]) =>
                        group.keys.includes(key) &&
                        label.toLowerCase().includes(seoSearch.trim().toLowerCase()),
                    );
                    if (!features.length) return null;
                    return (
                      <div key={group.label}>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ea580c]">
                          {group.label}
                        </p>
                        <div className="space-y-2">
                          {features.map(([key, label, kind]) =>
                            kind === "boolean" ? (
                              <ToggleRow
                                key={key}
                                label={label}
                                icon={Search}
                                enabled={form.seoFeatures[key] === true}
                                onChange={(value) => {
                                  setSeo(key, value);
                                  setSeoTier("custom");
                                }}
                              />
                            ) : (
                              <label
                                key={key}
                                className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2 text-xs font-bold text-[#0f172a] shadow-2xs"
                              >
                                <span>{label}</span>
                                <select
                                  value={String(form.seoFeatures[key])}
                                  onChange={(event) => {
                                    setSeo(key, event.target.value);
                                    setSeoTier("custom");
                                  }}
                                  className="min-w-32 rounded-lg border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669]"
                                >
                                  {kind.map((value) => (
                                    <option key={value} value={value}>
                                      {value.replaceAll("_", " ")}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </form>

        {/* Action Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-4">
          {isEdit ? (
            <button
              type="button"
              onClick={() => {
                if (confirm("Archive this plan? Active subscriptions are unaffected."))
                  archiveMutation.mutate();
              }}
              disabled={archiveMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
            >
              <Archive className="h-4 w-4" /> Archive
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] shadow-2xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="plan-drawer-form"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#047857] active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {createMutation.isPending ? "Saving…" : isEdit ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

function PlansPage() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["adminPlans"],
    queryFn: () => getPlans(),
  });

  const plans = (data?.plans ?? []).filter((p: any) =>
    showArchived ? true : p.status !== "archived",
  );

  function openCreate() {
    setEditingPlan(null);
    setDrawerOpen(true);
  }
  function openEdit(plan: any) {
    setEditingPlan(plan);
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setEditingPlan(null);
  }
  function onSaved() {
    queryClient.invalidateQueries({ queryKey: ["adminPlans"] });
    closeDrawer();
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="mt-1 text-xs text-slate-500">
            Define pricing tiers with granular limits and feature access.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${showArchived ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? "Hide Archived" : "Show Archived"}
          </button>
          <button
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-sm text-slate-500">Loading plans…</p>
        </div>
      ) : plans.length ? (
        <div className="grid items-stretch gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {plans.map((plan: any) => (
            <PlanCard key={plan._id} plan={plan} onEdit={openEdit} />
          ))}
          {/* Create new CTA card */}
          <button
            onClick={openCreate}
            className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-white/40 text-slate-500 transition hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">New Plan</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-20">
          <Zap className="h-12 w-12 text-slate-700 mb-4" />
          <h3 className="font-display text-lg font-bold text-slate-300">No plans yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first subscription plan to get started.
          </p>
          <button
            onClick={openCreate}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <PlanFormDrawer initial={editingPlan} onClose={closeDrawer} onSaved={onSaved} />
      )}
    </div>
  );
}
