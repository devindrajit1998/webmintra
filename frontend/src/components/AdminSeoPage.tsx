import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Save,
  SearchCheck,
  Share2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getSettings, updateSeoSettings, uploadAdminFile } from "@/lib/admin-api";

type SeoForm = {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  socialImageUrl: string;
  twitterHandle: string;
  locale: string;
  organizationName: string;
  organizationLogoUrl: string;
  allowIndexing: boolean;
};
type SeoField = keyof SeoForm;
type Errors = Partial<Record<SeoField, string>>;

const INITIAL: SeoForm = {
  title: "",
  description: "",
  keywords: "",
  canonicalUrl: "",
  socialImageUrl: "",
  twitterHandle: "",
  locale: "en_IN",
  organizationName: "WebMintra",
  organizationLogoUrl: "",
  allowIndexing: true,
};
const KEYS: Record<SeoField, string> = {
  title: "seo.defaultTitle",
  description: "seo.defaultDescription",
  keywords: "seo.keywords",
  canonicalUrl: "seo.canonicalUrl",
  socialImageUrl: "seo.socialImageUrl",
  twitterHandle: "seo.twitterHandle",
  locale: "seo.locale",
  organizationName: "seo.organizationName",
  organizationLogoUrl: "seo.organizationLogoUrl",
  allowIndexing: "seo.allowIndexing",
};

function mapSettings(settings: Array<{ key: string; value: unknown }>): SeoForm {
  const values = Object.fromEntries(settings.map(({ key, value }) => [key, value]));
  return {
    title: String(values[KEYS.title] ?? ""),
    description: String(values[KEYS.description] ?? ""),
    keywords: String(values[KEYS.keywords] ?? ""),
    canonicalUrl: String(values[KEYS.canonicalUrl] ?? ""),
    socialImageUrl: String(values[KEYS.socialImageUrl] ?? ""),
    twitterHandle: String(values[KEYS.twitterHandle] ?? ""),
    locale: String(values[KEYS.locale] ?? "en_IN"),
    organizationName: String(values[KEYS.organizationName] ?? "WebMintra"),
    organizationLogoUrl: String(values[KEYS.organizationLogoUrl] ?? ""),
    allowIndexing: values[KEYS.allowIndexing] !== false && values[KEYS.allowIndexing] !== "false",
  };
}
function validUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return ["http:", "https:"].includes(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}
function validate(form: SeoForm): Errors {
  const errors: Errors = {};
  if (!form.title.trim()) errors.title = "Search title is required.";
  else if (form.title.trim().length > 70) errors.title = "Use 70 characters or fewer.";
  if (!form.description.trim()) errors.description = "Meta description is required.";
  else if (form.description.trim().length > 180)
    errors.description = "Use 180 characters or fewer.";
  if (form.keywords.length > 300) errors.keywords = "Use 300 characters or fewer.";
  if (!validUrl(form.canonicalUrl)) errors.canonicalUrl = "Enter a complete http or https URL.";
  if (!validUrl(form.socialImageUrl)) errors.socialImageUrl = "Enter a complete http or https URL.";
  if (!validUrl(form.organizationLogoUrl))
    errors.organizationLogoUrl = "Enter a complete http or https URL.";
  if (form.twitterHandle && !/^@?[A-Za-z0-9_]{1,15}$/.test(form.twitterHandle.trim()))
    errors.twitterHandle = "Enter a valid X / Twitter handle.";
  if (!/^[a-z]{2}_[A-Z]{2}$/.test(form.locale.trim()))
    errors.locale = "Use language_REGION format, such as en_IN.";
  if (!form.organizationName.trim()) errors.organizationName = "Organization name is required.";
  return errors;
}

export function AdminSeoPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL);
  const [saved, setSaved] = useState(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState<"socialImageUrl" | "organizationLogoUrl" | null>(null);
  const query = useQuery({ queryKey: ["adminSettings", "seo"], queryFn: getSettings });

  useEffect(() => {
    if (!query.data?.settings) return;
    const next = mapSettings(query.data.settings);
    setForm(next);
    setSaved(next);
  }, [query.data]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const canonical = form.canonicalUrl.trim() || "https://webmintra.in/";
  const hostname = useMemo(() => {
    try {
      return new URL(canonical).hostname;
    } catch {
      return "webmintra.in";
    }
  }, [canonical]);
  const mutation = useMutation({
    mutationFn: updateSeoSettings,
    onSuccess: async () => {
      setSaved(form);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminSettings"] }),
        queryClient.invalidateQueries({ queryKey: ["publicSettings"] }),
      ]);
      toast.success("Landing page SEO saved.");
    },
    onError: (error: Error) => toast.error(error.message || "Unable to save SEO settings."),
  });

  function update<K extends SeoField>(field: K, value: SeoForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return toast.error("Review the highlighted SEO fields.");
    const updates = (Object.keys(KEYS) as SeoField[])
      .filter((field) => form[field] !== saved[field])
      .map((field) => ({ key: KEYS[field], value: form[field] }));
    if (updates.length) mutation.mutate(updates);
  }
  async function upload(field: "socialImageUrl" | "organizationLogoUrl", file?: File) {
    if (!file) return;
    try {
      setUploading(field);
      const result = await uploadAdminFile(file);
      if (!result?.url) throw new Error("Upload did not return an image URL.");
      update(field, result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setUploading(null);
    }
  }

  if (query.isLoading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#ea580c]" />
          <p className="text-xs font-medium text-[#64748b]">Loading search settings...</p>
        </div>
      </div>
    );
  if (query.isError)
    return (
      <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-5 text-sm font-medium text-[#c2410c]">
        Unable to load SEO settings.
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto w-full pb-24">
      <header className="mb-6 flex flex-col gap-4 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
            <SearchCheck className="h-4 w-4" /> Public website
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b192c]">Search Optimization</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Control how the WebMintra landing page appears in search and social results.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#475569] shadow-2xs transition hover:border-[#059669] hover:bg-[#ecfdf5] hover:text-[#047857]"
        >
          View landing page <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Panel icon={<SearchCheck className="h-4 w-4 text-[#ea580c]" />} title="Search result">
            <Field label="Search title" count={`${form.title.length}/70`} error={errors.title}>
              <input
                value={form.title}
                maxLength={70}
                onChange={(e) => update("title", e.target.value)}
                className={input(errors.title)}
              />
            </Field>
            <Field
              label="Meta description"
              count={`${form.description.length}/180`}
              error={errors.description}
            >
              <textarea
                rows={4}
                value={form.description}
                maxLength={180}
                onChange={(e) => update("description", e.target.value)}
                className={input(errors.description)}
              />
            </Field>
            <Field label="Keywords" count={`${form.keywords.length}/300`} error={errors.keywords}>
              <textarea
                rows={3}
                value={form.keywords}
                maxLength={300}
                placeholder="website builder, business website, no-code"
                onChange={(e) => update("keywords", e.target.value)}
                className={input(errors.keywords)}
              />
            </Field>
            <Field label="Canonical URL" error={errors.canonicalUrl}>
              <input
                type="url"
                value={form.canonicalUrl}
                placeholder="https://webmintra.in/"
                onChange={(e) => update("canonicalUrl", e.target.value)}
                className={input(errors.canonicalUrl)}
              />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div>
                <p className="text-xs font-bold text-[#0b192c]">Search indexing</p>
                <p className="mt-0.5 text-xs text-[#64748b]">
                  Allow search engines to index and follow the landing page.
                </p>
              </div>
              <Switch
                checked={form.allowIndexing}
                onCheckedChange={(value) => update("allowIndexing", value)}
                className="data-[state=checked]:bg-[#059669]"
              />
            </div>
          </Panel>
          <Panel icon={<Share2 className="h-4 w-4 text-[#ea580c]" />} title="Social sharing">
            <ImageField
              label="Social preview image"
              value={form.socialImageUrl}
              error={errors.socialImageUrl}
              busy={uploading === "socialImageUrl"}
              onChange={(value) => update("socialImageUrl", value)}
              onUpload={(file) => void upload("socialImageUrl", file)}
            />
            <Field label="X / Twitter handle" error={errors.twitterHandle}>
              <input
                value={form.twitterHandle}
                placeholder="@webmintra"
                onChange={(e) => update("twitterHandle", e.target.value)}
                className={input(errors.twitterHandle)}
              />
            </Field>
            <Field label="Content locale" error={errors.locale}>
              <input
                value={form.locale}
                placeholder="en_IN"
                onChange={(e) => update("locale", e.target.value)}
                className={input(errors.locale)}
              />
            </Field>
          </Panel>
          <Panel icon={<SearchCheck className="h-4 w-4 text-[#ea580c]" />} title="Organization data">
            <Field label="Organization name" error={errors.organizationName}>
              <input
                value={form.organizationName}
                maxLength={120}
                onChange={(e) => update("organizationName", e.target.value)}
                className={input(errors.organizationName)}
              />
            </Field>
            <ImageField
              label="Organization logo"
              value={form.organizationLogoUrl}
              error={errors.organizationLogoUrl}
              busy={uploading === "organizationLogoUrl"}
              onChange={(value) => update("organizationLogoUrl", value)}
              onUpload={(file) => void upload("organizationLogoUrl", file)}
              compact
            />
          </Panel>
        </div>
        <aside className="space-y-6 xl:sticky xl:top-22">
          <Preview title="Search preview">
            <div className="bg-white p-5">
              <p className="text-xs text-[#202124]">
                {form.organizationName || "WebMintra"}
                <br />
                <span className="text-[11px] text-[#5f6368]">{canonical}</span>
              </p>
              <p className="mt-2 line-clamp-2 text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer">
                {form.title || "Landing page title"}
              </p>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[#4d5156]">
                {form.description || "Your landing page description will appear here."}
              </p>
            </div>
          </Preview>
          <Preview title="Social preview">
            <div className="m-4 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-2xs">
              <div className="aspect-[1.91/1] bg-[#f1f5f9]">
                {form.socialImageUrl ? (
                  <img
                    src={form.socialImageUrl}
                    alt="Social preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <ImageIcon className="h-10 w-10 text-[#94a3b8]" />
                  </div>
                )}
              </div>
              <div className="border-t border-[#e2e8f0] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{hostname}</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold text-[#0b192c]">
                  {form.title || "Landing page title"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[#64748b]">
                  {form.description || "Your landing page description will appear here."}
                </p>
              </div>
            </div>
          </Preview>
          <div
            className={`rounded-xl border px-4 py-3 text-xs font-semibold ${form.allowIndexing
                ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
                : "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
              }`}
          >
            {form.allowIndexing ? "✓ Landing page can be indexed by search engines" : "⚠️ Landing page is set to noindex"}
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e2e8f0] bg-white/95 p-3.5 backdrop-blur shadow-lg lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="text-xs font-semibold text-[#64748b]">
            {dirty ? "You have unsaved SEO changes" : "All changes saved"}
          </p>
          <button
            type="submit"
            disabled={!dirty || mutation.isPending || uploading !== null}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#059669] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            {mutation.isPending ? "Saving..." : "Save SEO Settings"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
      <header className="flex items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3.5">
        {icon}
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">{title}</h2>
      </header>
      <div className="grid gap-5 p-5">{children}</div>
    </section>
  );
}
function Preview({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
      <header className="border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
        {title}
      </header>
      {children}
    </section>
  );
}
function Field({
  label,
  count,
  error,
  children,
}: {
  label: string;
  count?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-xs font-bold text-[#475569]">
        <span>{label}</span>
        {count && <span className="font-mono text-[10px] text-[#94a3b8]">{count}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-semibold text-[#c2410c]">{error}</span>}
    </label>
  );
}
function ImageField({
  label,
  value,
  error,
  busy,
  onChange,
  onUpload,
  compact,
}: {
  label: string;
  value: string;
  error?: string | undefined;
  busy: boolean;
  onChange: (value: string) => void;
  onUpload: (file?: File) => void;
  compact?: boolean | undefined;
}) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-start gap-3">
        <div
          className={`${compact ? "h-16 w-16" : "h-20 w-32"} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[#cbd5e1] bg-[#f8fafc]`}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <ImageIcon className="h-6 w-6 text-[#94a3b8]" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="url"
            value={value}
            placeholder="https://..."
            onChange={(e) => onChange(e.target.value)}
            className={input(error)}
          />
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#475569] shadow-2xs transition hover:border-[#a7f3d0] hover:bg-[#ecfdf5] hover:text-[#047857]">
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              className="sr-only"
              onChange={(e) => {
                onUpload(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ea580c]" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-[#ea580c]" />
            )}{" "}
            Upload Image
          </label>
        </div>
      </div>
    </Field>
  );
}
function input(error?: string) {
  return `w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition placeholder:text-[#94a3b8] ${error ? "border-[#f87171] focus:border-[#ef4444] focus:ring-2 focus:ring-[#ef4444]/15" : "border-[#cbd5e1] focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"}`;
}

