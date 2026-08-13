import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getPlans, createPlan, updatePlan, deletePlan } from "@/lib/admin-api";
import {
  Loader2, Plus, Edit, Check, X, Globe, Database, Users, Zap, Mail,
  BarChart2, Search, ShieldCheck, FileText, Sparkles, ChevronRight,
  Archive, Eye, EyeOff, Wifi
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
  websites: 1, pagesPerWebsite: 5, customDomains: 0, storageMb: 500,
  bandwidthGb: 10, collaborators: 1, emailsPerMonth: 0, aiCreditsPerMonth: 0,
};

const DEFAULT_FEATURES = {
  customDomain: false, removeBranding: false, apiAccess: false,
  prioritySupport: false, analytics: false, seoTools: false,
  formSubmissions: true, passwordProtectedPages: false,
};

const SEO_FEATURES = [
  ["pageTitle", "Page title", "boolean"], ["metaDescription", "Meta description", "boolean"], ["searchKeywords", "Search keywords", "boolean"],
  ["canonicalUrl", "Canonical URL", "boolean"], ["socialTitle", "Social title", "boolean"], ["socialDescription", "Social description", "boolean"], ["socialImage", "Social image", "boolean"], ["twitterCard", "Twitter/X card", "boolean"],
  ["robotsDirective", "Robots directive", ["basic", "custom", "advanced"]], ["xmlSitemap", "XML Sitemap", "boolean"], ["sitemapCustomization", "Sitemap customization", "boolean"], ["schemaJsonLd", "Schema / JSON-LD", ["disabled", "basic_presets", "custom_json_ld"]], ["structuredDataPresets", "Structured data presets", "boolean"], ["openGraph", "Open Graph", "boolean"],
  ["googleVerification", "Google verification", "boolean"], ["searchConsoleIntegration", "Search Console integration", "boolean"], ["googleAnalytics", "Google Analytics", "boolean"], ["redirects301", "301 redirects", "boolean"], ["custom404", "404 page customization", "boolean"], ["seoHealthScore", "SEO health score", ["basic", "advanced"]],
  ["seoRecommendations", "SEO recommendations", ["disabled", "enabled", "ai_advanced"]], ["imageAltText", "Image alt-text controls", ["basic", "enabled"]], ["indexNoIndexPerPage", "Index/no-index per page", "boolean"], ["seoSettingsPerPage", "SEO settings per page", ["limited", "enabled"]], ["globalSeoSettings", "Global SEO settings", "boolean"],
] as const;
type SeoFeatureKey = typeof SEO_FEATURES[number][0];
type SeoFeatures = Record<SeoFeatureKey, boolean | string>;
const DEFAULT_SEO_FEATURES: SeoFeatures = Object.fromEntries(SEO_FEATURES.map(([key, , kind]) => [key, kind === "boolean" ? false : Array.isArray(kind) ? kind[0] : "basic"])) as SeoFeatures;
const SEO_GROUPS: Array<{ label: string; keys: SeoFeatureKey[] }> = [
  { label: "Metadata", keys: ["pageTitle", "metaDescription", "searchKeywords", "canonicalUrl", "globalSeoSettings", "seoSettingsPerPage"] },
  { label: "Social sharing", keys: ["socialTitle", "socialDescription", "socialImage", "twitterCard", "openGraph"] },
  { label: "Crawling and indexing", keys: ["robotsDirective", "xmlSitemap", "sitemapCustomization", "indexNoIndexPerPage", "redirects301", "custom404"] },
  { label: "Structured data", keys: ["schemaJsonLd", "structuredDataPresets", "imageAltText"] },
  { label: "Google integrations", keys: ["googleVerification", "searchConsoleIntegration", "googleAnalytics"] },
  { label: "Optimization", keys: ["seoHealthScore", "seoRecommendations"] },
];

type PlanForm = {
  name: string; slug: string; description: string;
  pricing: { monthly: number | null; yearly: number | null };
  trialDays: number;
  isPublic: boolean; sortOrder: number;
  limits: typeof DEFAULT_LIMITS;
  features: typeof DEFAULT_FEATURES;
  seoFeatures: SeoFeatures;
};

function makeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const EMPTY_FORM: PlanForm = {
  name: "", slug: "", description: "",
  pricing: { monthly: 499, yearly: 4990 }, trialDays: 0,
  isPublic: true, sortOrder: 0,
  limits: { ...DEFAULT_LIMITS },
  features: { ...DEFAULT_FEATURES },
  seoFeatures: { ...DEFAULT_SEO_FEATURES, pageTitle: true, metaDescription: true, searchKeywords: true, xmlSitemap: true, globalSeoSettings: true },
};

// ── Sub-components ──────────────────────────────────────────────

function SelectRow({ label, icon: Icon, value, options, unit, onChange }: {
  label: string; icon: any; value: number;
  options: readonly number[]; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>{label}</span>
      </div>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-500 min-w-[130px] text-right"
      >
        {options.map((opt, i) => (
          <option key={`${opt}-${i}`} value={opt}>
            {opt === 0 ? "Unlimited / Off" : `${opt.toLocaleString()} ${unit}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({ label, icon: Icon, enabled, description, onChange }: {
  label: string; icon: any; enabled: boolean; description?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${enabled ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-slate-900/30 border border-slate-800"}`}
      onClick={() => onChange(!enabled)}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${enabled ? "text-emerald-400" : "text-slate-500"}`} />
        <div>
          <p className={`text-sm font-medium ${enabled ? "text-emerald-300" : "text-slate-400"}`}>{label}</p>
          {description && <p className="text-[10px] text-slate-500">{description}</p>}
        </div>
      </div>
      <div className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-slate-700"}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : ""}`} />
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
    <div className={`relative flex flex-col rounded-xl border bg-[#0b1826] transition-all ${isArchived ? "border-slate-800/40 opacity-50" : "border-slate-800 hover:border-slate-700"}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-lg font-bold text-slate-200">{plan.displayName || (plan.slug === "pro" ? "Business" : plan.name)}</h3>
            {plan.isPublic ? <Eye className="h-3.5 w-3.5 text-slate-500" /> : <EyeOff className="h-3.5 w-3.5 text-slate-600" />}
          </div>
          <p className="text-xs text-slate-500 font-mono">/{plan.slug}</p>
          {plan.description && <p className="mt-2 text-xs text-slate-400 leading-relaxed">{plan.description}</p>}
        </div>
        <span className={`ml-2 shrink-0 rounded-full px-2 py-1 text-[10px] font-medium capitalize ${plan.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>
          {plan.status}
        </span>
      </div>

      {/* Pricing */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex gap-4">
          {plan.pricing?.monthly !== null && (
            <div>
              <p className="font-display text-2xl font-bold text-white">
                ₹{plan.pricing?.monthly}
                <span className="ml-1 text-xs font-normal text-slate-500">/ mo</span>
              </p>
            </div>
          )}
          {plan.pricing?.yearly !== null && (
            <div>
              <p className="font-display text-2xl font-bold text-white">
                ₹{plan.pricing?.yearly}
                <span className="ml-1 text-xs font-normal text-slate-500">/ yr</span>
              </p>
            </div>
          )}
          {plan.pricing?.monthly === null && plan.pricing?.yearly === null && (
            <p className="font-display text-2xl font-bold text-slate-400">Free</p>
          )}
        </div>
        {plan.trialDays > 0 && <p className="mt-1 text-xs text-cyan-400">{plan.trialDays}-day free trial</p>}
      </div>

      {/* Limits */}
      <div className="px-5 py-3 space-y-1.5 border-b border-slate-800 flex-1">
        <LimitBadge icon={Globe} label={`${fmt(lim.websites, "Websites")}`} />
        <LimitBadge icon={FileText} label={`${fmt(lim.pagesPerWebsite, "Pages/site")}`} />
        <LimitBadge icon={Database} label={`${fmt(lim.storageMb, "MB Storage")}`} />
        <LimitBadge icon={Wifi} label={`${fmt(lim.bandwidthGb, "GB Bandwidth")}`} />
        <LimitBadge icon={Users} label={`${fmt(lim.collaborators, "Collaborators")}`} />
        {lim.emailsPerMonth > 0 && <LimitBadge icon={Mail} label={`${fmt(lim.emailsPerMonth, "Emails/mo")}`} />}
        {lim.aiCreditsPerMonth > 0 && <LimitBadge icon={Sparkles} label={`${fmt(lim.aiCreditsPerMonth, "AI Credits/mo")}`} />}
      </div>

      {/* Feature badges */}
      <div className="px-5 py-3 flex flex-wrap gap-1.5 border-b border-slate-800">
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
          onClick={() => onEdit(plan)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
        >
          <Edit className="h-4 w-4" /> Edit Plan
        </button>
      </div>
    </div>
  );
}

function LimitBadge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Icon className="h-3 w-3 text-slate-600 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function FeatureBadge({ label, color = "emerald" }: { label: string; color?: "emerald" | "blue" }) {
  const cls = color === "blue"
    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Plan Form Drawer ───────────────────────────────────────────

function PlanFormDrawer({
  initial, onClose, onSaved
}: {
  initial?: PlanForm & { _id?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState<PlanForm>(initial ? {
    name: initial.name, slug: initial.slug, description: initial.description ?? "",
    pricing: { monthly: initial.pricing?.monthly ?? 499, yearly: initial.pricing?.yearly ?? 4990 }, trialDays: initial.trialDays ?? 0,
    isPublic: initial.isPublic ?? true, sortOrder: initial.sortOrder ?? 0,
    limits: { ...DEFAULT_LIMITS, ...initial.limits },
    features: { ...DEFAULT_FEATURES, ...initial.features },
    seoFeatures: { ...DEFAULT_SEO_FEATURES, ...initial.seoFeatures },
  } : { ...EMPTY_FORM });

  const [seoSearch, setSeoSearch] = useState("");

  const setLim = (k: keyof typeof DEFAULT_LIMITS) => (v: number) =>
    setForm(f => ({ ...f, limits: { ...f.limits, [k]: v } }));
  const setFeat = (k: keyof typeof DEFAULT_FEATURES) => (v: boolean) =>
    setForm(f => ({ ...f, features: { ...f.features, [k]: v } }));
  const setSeo = (k: SeoFeatureKey, v: boolean | string) => setForm(f => ({ ...f, seoFeatures: { ...f.seoFeatures, [k]: v } }));

  const createMutation = useMutation({
    mutationFn: (data: any) => isEdit ? updatePlan(initial!._id!, data) : createPlan(data),
    onSuccess: () => { toast.success(isEdit ? "Plan updated!" : "Plan created!"); onSaved(); },
    onError: (err: any) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: () => deletePlan(initial!._id!),
    onSuccess: () => { toast.success("Plan archived"); onSaved(); },
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[520px] flex-col border-l border-slate-800 bg-[#08111e] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/50">
          <div>
            <h2 className="font-display text-lg font-bold">{isEdit ? "Edit Plan" : "Create New Plan"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{isEdit ? `Editing "${initial?.slug === "pro" ? "Business" : initial?.name}"` : "Configure all plan limits and features."}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">

            {/* Basic Info */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Basic Info</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-400">Plan Name</label>
                  <input
                    required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: makeSlug(e.target.value) }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
                    placeholder="e.g. Business Monthly"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">URL Slug (auto-generated)</label>
                  <div className="mt-1 flex h-10 items-center rounded-lg border border-slate-700 bg-slate-900/50 px-3">
                    <span className="text-slate-500 text-sm mr-1">/</span>
                    <input
                      required value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      className="flex-1 bg-transparent text-sm text-slate-300 outline-none font-mono"
                      placeholder="business-monthly"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Description (optional)</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 resize-none"
                    placeholder="Short description shown on pricing page..."
                  />
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Pricing</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400">Monthly Price (INR ₹)</label>
                  <input type="number" min="0" value={form.pricing.monthly === null ? "" : form.pricing.monthly}
                    onChange={e => setForm(f => ({ ...f, pricing: { ...f.pricing, monthly: e.target.value === "" ? null : Number(e.target.value) } }))}
                    placeholder="Empty = N/A, 0 = Free"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Yearly Price (INR ₹)</label>
                  <input type="number" min="0" value={form.pricing.yearly === null ? "" : form.pricing.yearly}
                    onChange={e => setForm(f => ({ ...f, pricing: { ...f.pricing, yearly: e.target.value === "" ? null : Number(e.target.value) } }))}
                    placeholder="Empty = N/A, 0 = Free"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Trial Days</label>
                  <select value={form.trialDays} onChange={e => setForm(f => ({ ...f, trialDays: Number(e.target.value) }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500">
                    {TRIAL_OPTIONS.map(d => <option key={d} value={d}>{d === 0 ? "No trial" : `${d} days`}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2.5 cursor-pointer"
                onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  {form.isPublic ? <Eye className="h-4 w-4 text-cyan-400" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
                  <span>{form.isPublic ? "Publicly visible on pricing page" : "Hidden — internal use only"}</span>
                </div>
                <div className={`relative h-5 w-9 rounded-full transition-colors ${form.isPublic ? "bg-cyan-500" : "bg-slate-700"}`}>
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isPublic ? "translate-x-4" : ""}`} />
                </div>
              </div>
            </section>

            {/* Limits */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Usage Limits</h3>
              <p className="text-[10px] text-slate-500 mb-3">"Unlimited / Off" sets the value to 0, which the system treats as unlimited (or disabled for emails/AI credits).</p>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-1 divide-y divide-slate-800/60">
                <SelectRow label="Websites" icon={Globe} value={form.limits.websites} options={WEBSITE_OPTIONS} unit="websites" onChange={setLim("websites")} />
                <SelectRow label="Pages per website" icon={FileText} value={form.limits.pagesPerWebsite} options={PAGES_OPTIONS} unit="pages" onChange={setLim("pagesPerWebsite")} />
                <SelectRow label="Custom domains" icon={Globe} value={form.limits.customDomains} options={[0, 1, 2, 5, 10]} unit="domains" onChange={setLim("customDomains")} />
                <SelectRow label="Storage" icon={Database} value={form.limits.storageMb} options={STORAGE_OPTIONS} unit="MB" onChange={setLim("storageMb")} />
                <SelectRow label="Bandwidth" icon={Wifi} value={form.limits.bandwidthGb} options={BANDWIDTH_OPTIONS} unit="GB" onChange={setLim("bandwidthGb")} />
                <SelectRow label="Collaborators" icon={Users} value={form.limits.collaborators} options={COLLAB_OPTIONS} unit="members" onChange={setLim("collaborators")} />
                <SelectRow label="Emails per month" icon={Mail} value={form.limits.emailsPerMonth} options={EMAIL_OPTIONS} unit="emails" onChange={setLim("emailsPerMonth")} />
                <SelectRow label="AI credits / month" icon={Sparkles} value={form.limits.aiCreditsPerMonth} options={AI_OPTIONS} unit="credits" onChange={setLim("aiCreditsPerMonth")} />
              </div>
            </section>

            {/* Features */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Feature Access</h3>
              <div className="space-y-2">
                <ToggleRow label="Custom Domain Support" icon={Globe} enabled={form.features.customDomain} description="Allow tenants to connect their own domain" onChange={setFeat("customDomain")} />
                <ToggleRow label="White Label (Remove Branding)" icon={Zap} enabled={form.features.removeBranding} description="Hide all WebMintra branding from published sites" onChange={setFeat("removeBranding")} />
                <ToggleRow label="API Access" icon={ShieldCheck} enabled={form.features.apiAccess} description="Grant access to the developer REST API" onChange={setFeat("apiAccess")} />
                <ToggleRow label="Analytics Dashboard" icon={BarChart2} enabled={form.features.analytics} description="Built-in visitor analytics and heatmaps" onChange={setFeat("analytics")} />
                <ToggleRow label="SEO Tools" icon={Search} enabled={form.features.seoTools} description="Meta tags, sitemaps, robots.txt editor" onChange={setFeat("seoTools")} />
                <ToggleRow label="Form Submissions" icon={FileText} enabled={form.features.formSubmissions} description="Capture and export form data" onChange={setFeat("formSubmissions")} />
                <ToggleRow label="Password-Protected Pages" icon={ShieldCheck} enabled={form.features.passwordProtectedPages} description="Lock individual pages with a password" onChange={setFeat("passwordProtectedPages")} />
                <ToggleRow label="Priority Support" icon={Sparkles} enabled={form.features.prioritySupport} description="Dedicated support queue with faster SLA" onChange={setFeat("prioritySupport")} />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">SEO plan access</h3>
              <p className="text-[10px] text-slate-500 mb-3">Control which SEO tools and levels this plan includes. The Business plan keeps the internal pro identifier.</p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={seoSearch} onChange={(event) => setSeoSearch(event.target.value)} placeholder="Search SEO capabilities" className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-cyan-500" />
              </div>
              <div className="space-y-4">
                {SEO_GROUPS.map((group) => {
                  const features = SEO_FEATURES.filter(([key, label]) => group.keys.includes(key) && label.toLowerCase().includes(seoSearch.trim().toLowerCase()));
                  if (!features.length) return null;
                  return <div key={group.label}>
                    <p className="mb-2 text-[10px] font-semibold uppercase text-slate-500">{group.label}</p>
                    <div className="space-y-2">
                      {features.map(([key, label, kind]) => kind === "boolean" ? (
                        <ToggleRow key={key} label={label} icon={Search} enabled={form.seoFeatures[key] === true} onChange={(value) => setSeo(key, value)} />
                      ) : (
                        <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2.5 text-sm text-slate-300">
                          <span>{label}</span>
                          <select value={String(form.seoFeatures[key])} onChange={(event) => setSeo(key, event.target.value)} className="min-w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200">
                            {kind.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>;
                })}
                {seoSearch && !SEO_FEATURES.some(([, label]) => label.toLowerCase().includes(seoSearch.trim().toLowerCase())) ? <p className="rounded-lg border border-slate-800 p-3 text-center text-xs text-slate-500">No SEO capabilities match this search.</p> : null}
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-800 bg-[#08111e] px-6 py-4">
            {isEdit && (
              <button
                type="button"
                onClick={() => { if (confirm("Archive this plan? Active subscriptions are unaffected.")) archiveMutation.mutate(); }}
                disabled={archiveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-900/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/20"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            )}
            <div className="ml-auto flex gap-3">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {createMutation.isPending ? "Saving…" : (isEdit ? "Update Plan" : "Create Plan")}
              </button>
            </div>
          </div>
        </form>
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

  const plans = (data?.plans ?? []).filter((p: any) => showArchived ? true : p.status !== "archived");

  function openCreate() { setEditingPlan(null); setDrawerOpen(true); }
  function openEdit(plan: any) { setEditingPlan(plan); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); setEditingPlan(null); }
  function onSaved() { queryClient.invalidateQueries({ queryKey: ["adminPlans"] }); closeDrawer(); }

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="mt-1 text-xs text-slate-500">Define pricing tiers with granular limits and feature access.</p>
        </div>
        <div className="flex items-center gap-3">
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
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan: any) => (
            <PlanCard key={plan._id} plan={plan} onEdit={openEdit} />
          ))}
          {/* Create new CTA card */}
          <button
            onClick={openCreate}
            className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-800 text-slate-500 transition hover:border-slate-600 hover:text-slate-300"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">New Plan</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-20">
          <Zap className="h-12 w-12 text-slate-700 mb-4" />
          <h3 className="font-display text-lg font-bold text-slate-300">No plans yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first subscription plan to get started.</p>
          <button onClick={openCreate} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <PlanFormDrawer
          initial={editingPlan}
          onClose={closeDrawer}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
