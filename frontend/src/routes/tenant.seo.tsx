import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Code2,
  ExternalLink,
  FileSearch,
  Globe2,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  Save,
  Search,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useTenantContext } from "@/components/TenantDashboard";
import { getWebsite, publishWebsite, saveDraft } from "@/lib/auth-api";
import type { SeoEntitlements } from "@/lib/auth-api";
import type { EditorState, RedirectRule, SeoData } from "@/lib/template-engine/types";

export const Route = createFileRoute("/tenant/seo")({
  component: SeoPage,
  head: () => ({ meta: [{ title: "SEO Manager | WebMintra" }] }),
});

type SeoForm = Omit<SeoData, "schema"> & { schema: string };
type PreviewMode = "search" | "social";
type SeoScope = { kind: "global" } | { kind: "page"; pageId: string };
type PageOption = { id: string; label: string; route: string };

const EMPTY_SEO: SeoForm = {
  title: "",
  description: "",
  keywords: "",
  canonical: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterCard: "summary_large_image",
  robots: "index, follow",
  favicon: "",
  schema: "",
};

const EMPTY_SITEMAP = { excludedPageIds: [], priorities: {}, changefreq: {} };
const CHANGE_FREQUENCIES = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

function SeoPage() {
  const { websites } = useTenantContext();
  const queryClient = useQueryClient();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [scope, setScope] = useState<SeoScope>({ kind: "page", pageId: "page-0" });
  const [draft, setDraft] = useState<Partial<EditorState>>({});
  const [savedSnapshot, setSavedSnapshot] = useState("{}");
  const [preview, setPreview] = useState<PreviewMode>("search");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const activeWebsiteId = selectedWebsiteId || websites[0]?.id || "";
  const activeWebsite = websites.find((website) => website.id === activeWebsiteId);

  const websiteQuery = useQuery({
    queryKey: ["website", activeWebsiteId],
    queryFn: () => getWebsite(activeWebsiteId),
    enabled: Boolean(activeWebsiteId),
  });

  const pages = useMemo(
    () => buildPageOptions(websiteQuery.data?.htmlContent, websiteQuery.data?.pages),
    [websiteQuery.data?.htmlContent, websiteQuery.data?.pages],
  );

  useEffect(() => {
    const website = websiteQuery.data?.website;
    if (!website) return;
    const next = structuredClone(website.draftState ?? {});
    const normalized = normalizeLegacyHomepageSeo(next);
    setDraft(normalized);
    setSavedSnapshot(JSON.stringify(normalized));
    setScope({ kind: "page", pageId: "page-0" });
  }, [websiteQuery.data?.website, activeWebsiteId]);

  const entitlements = websiteQuery.data?.seoEntitlements;
  const features = entitlements?.seoFeatures ?? {};
  const has = (key: string) => featureEnabled(features[key]);
  const canUseGlobal = has("globalSeoSettings");
  const canUsePerPage = has("seoSettingsPerPage");
  const dirty = JSON.stringify(draft) !== savedSnapshot;
  const form = seoFormFrom(scope.kind === "global" ? draft.globalSeo : draft.seo?.[scope.pageId]);
  const selectedPage =
    scope.kind === "page" ? pages.find((page) => page.id === scope.pageId) : undefined;
  const audit = useMemo(() => buildAudit(form, entitlements), [form, entitlements]);
  const passedCount = audit.filter((item) => item.status === "pass").length;
  const score = audit.length ? Math.round((passedCount / audit.length) * 100) : 0;

  const updateSeo = <K extends keyof SeoForm>(key: K, value: SeoForm[K]) => {
    setDraft((current) => {
      const seo = { ...form, [key]: value };
      return scope.kind === "global"
        ? { ...current, globalSeo: seo }
        : { ...current, seo: { ...(current.seo ?? {}), [scope.pageId]: seo } };
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => saveDraft(activeWebsiteId, draft as EditorState),
    onSuccess: async (result) => {
      const saved = normalizeLegacyHomepageSeo(structuredClone(result.website.draftState ?? draft));
      setDraft(saved);
      setSavedSnapshot(JSON.stringify(saved));
      await queryClient.invalidateQueries({ queryKey: ["website", activeWebsiteId] });
      await queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast.success("SEO settings saved to draft.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (dirty) await saveMutation.mutateAsync();
      return publishWebsite(activeWebsiteId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website", activeWebsiteId] });
      await queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast.success("SEO changes published.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!websites.length) return <NoWebsite />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">SEO manager</h1>
            {dirty ? (
              <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                Unsaved changes
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Manage indexing, search appearance, integrations, and public URL behavior.
          </p>
          {entitlements ? (
            <p className="mt-1 text-xs text-cyan-300">{entitlements.planName} plan SEO access</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select website"
            value={activeWebsiteId}
            onChange={(event) => setSelectedWebsiteId(event.target.value)}
            className="h-10 min-w-44 rounded-lg border border-slate-700 bg-[#0b1826] px-3 text-xs text-slate-200 outline-none focus:border-cyan-400"
          >
            {websites.map((website) => (
              <option key={website.id} value={website.id}>
                {website.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 px-4 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save draft
          </button>
          <button
            type="button"
            disabled={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-bold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {publishMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe2 className="h-4 w-4" />
            )}
            Publish
          </button>
        </div>
      </header>

      {websiteQuery.isLoading ? (
        <LoadingState />
      ) : websiteQuery.isError ? (
        <ErrorState
          message={(websiteQuery.error as Error).message}
          retry={() => websiteQuery.refetch()}
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="space-y-5">
            <section className="rounded-lg border border-slate-800 bg-[#0b1826] p-4">
              <label className="block text-xs font-semibold text-slate-300">Editing scope</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
                <select
                  value={scope.kind}
                  onChange={(event) =>
                    setScope(
                      event.target.value === "global"
                        ? { kind: "global" }
                        : { kind: "page", pageId: pages[0]?.id ?? "page-0" },
                    )
                  }
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-xs text-slate-200"
                  disabled={!canUseGlobal || !canUsePerPage}
                >
                  {canUsePerPage ? <option value="page">Page settings</option> : null}
                  {canUseGlobal ? <option value="global">Global defaults</option> : null}
                </select>
                {scope.kind === "page" ? (
                  <select
                    value={scope.pageId}
                    onChange={(event) => setScope({ kind: "page", pageId: event.target.value })}
                    className="h-10 rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-xs text-slate-200"
                    disabled={!canUsePerPage}
                  >
                    {pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.label} ({page.route})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex h-10 items-center rounded-lg border border-slate-800 px-3 text-xs text-slate-400">
                    Defaults inherited by every page unless overridden
                  </div>
                )}
              </div>
            </section>

            <SeoEditorSections
              form={form}
              features={features}
              websiteName={activeWebsite?.name ?? ""}
              pageLabel={scope.kind === "global" ? "all pages" : (selectedPage?.label ?? "page")}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              update={updateSeo}
            />

            {has("sitemapCustomization") ? (
              <SitemapSection pages={pages} draft={draft} setDraft={setDraft} />
            ) : null}
            {has("googleVerification") ||
            has("searchConsoleIntegration") ||
            has("googleAnalytics") ? (
              <IntegrationSection draft={draft} setDraft={setDraft} features={features} />
            ) : null}
            {has("redirects301") ? (
              <RedirectSection
                redirects={draft.redirects ?? []}
                onChange={(redirects) => setDraft((current) => ({ ...current, redirects }))}
              />
            ) : null}
            {has("custom404") ? (
              <Custom404Section
                pages={pages}
                pageId={draft.custom404?.pageId ?? ""}
                onChange={(pageId) =>
                  setDraft((current) => ({
                    ...current,
                    custom404: pageId ? { pageId } : undefined,
                  }))
                }
              />
            ) : null}
          </main>

          <aside className="space-y-5 xl:sticky xl:top-6">
            {has("seoHealthScore") ? (
              <section className="rounded-lg border border-slate-800 bg-[#0b1826] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">SEO readiness</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {passedCount} of {audit.length} checks passed
                    </p>
                  </div>
                  <ScoreRing score={score} />
                </div>
                <div className="mt-5 space-y-2">
                  {audit.map((item) => (
                    <AuditRow key={item.label} {...item} />
                  ))}
                </div>
              </section>
            ) : null}
            <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#0b1826]">
              <div className="flex items-center justify-between border-b border-slate-800 p-4">
                <h2 className="font-display text-sm font-bold">Live preview</h2>
                <div className="flex rounded-lg border border-slate-700 p-0.5">
                  <PreviewButton
                    label="Search"
                    active={preview === "search"}
                    onClick={() => setPreview("search")}
                    icon={<Search className="h-3.5 w-3.5" />}
                  />
                  <PreviewButton
                    label="Social"
                    active={preview === "social"}
                    onClick={() => setPreview("social")}
                    icon={<Share2 className="h-3.5 w-3.5" />}
                  />
                </div>
              </div>
              <div className="p-5">
                {preview === "search" ? (
                  <SearchPreview form={form} websiteName={activeWebsite?.name || "Your website"} />
                ) : (
                  <SocialPreview form={form} websiteName={activeWebsite?.name || "Your website"} />
                )}
              </div>
            </section>
            <Link
              to="/tenant/domains"
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0b1826] p-4 transition hover:border-slate-600"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <Globe2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-200">Domain settings</span>
                <span className="mt-1 block text-[10px] text-slate-500">
                  Connect a domain for canonical URLs.
                </span>
              </span>
              <ExternalLink className="h-4 w-4 text-slate-600" />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function SeoEditorSections({
  form,
  features,
  websiteName,
  pageLabel,
  showAdvanced,
  setShowAdvanced,
  update,
}: {
  form: SeoForm;
  features: Record<string, boolean | string>;
  websiteName: string;
  pageLabel: string;
  showAdvanced: boolean;
  setShowAdvanced: (value: boolean) => void;
  update: <K extends keyof SeoForm>(key: K, value: SeoForm[K]) => void;
}) {
  const has = (key: string) => featureEnabled(features[key]);
  return (
    <>
      <section className="rounded-lg border border-slate-800 bg-[#0b1826]">
        <SectionHeading
          icon={<FileSearch className="h-5 w-5" />}
          title="Search appearance"
          detail={`Metadata for ${pageLabel}.`}
          tone="cyan"
        />
        <div className="space-y-5 p-5">
          {has("pageTitle") ? (
            <SeoField
              label="Page title"
              value={form.title}
              onChange={(value) => update("title", value)}
              placeholder={websiteName || "Your website title"}
              maxLength={60}
            />
          ) : null}
          {has("metaDescription") ? (
            <SeoField
              label="Meta description"
              value={form.description}
              onChange={(value) => update("description", value)}
              placeholder="Describe what visitors will find on this page."
              maxLength={160}
              multiline
            />
          ) : null}
          {has("searchKeywords") ? (
            <SeoField
              label="Search keywords"
              value={form.keywords}
              onChange={(value) => update("keywords", value)}
              placeholder="service, location, topic"
            />
          ) : null}
          {has("canonicalUrl") ? (
            <SeoField
              label="Canonical URL"
              value={form.canonical}
              onChange={(value) => update("canonical", value)}
              placeholder="https://www.example.com/page"
              inputMode="url"
            />
          ) : null}
        </div>
      </section>
      {has("openGraph") ||
      has("socialTitle") ||
      has("socialDescription") ||
      has("socialImage") ||
      has("twitterCard") ? (
        <section className="rounded-lg border border-slate-800 bg-[#0b1826]">
          <SectionHeading
            icon={<Share2 className="h-5 w-5" />}
            title="Social sharing"
            detail="Link previews for social platforms."
            tone="violet"
          />
          <div className="space-y-5 p-5">
            {has("socialTitle") ? (
              <SeoField
                label="Social title"
                value={form.ogTitle}
                onChange={(value) => update("ogTitle", value)}
                placeholder={form.title || websiteName}
                maxLength={60}
              />
            ) : null}
            {has("socialDescription") ? (
              <SeoField
                label="Social description"
                value={form.ogDescription}
                onChange={(value) => update("ogDescription", value)}
                placeholder={form.description}
                maxLength={160}
                multiline
              />
            ) : null}
            {has("socialImage") ? (
              <SeoField
                label="Social image URL"
                value={form.ogImage}
                onChange={(value) => update("ogImage", value)}
                placeholder="https://www.example.com/share-image.jpg"
                inputMode="url"
              />
            ) : null}
            {has("twitterCard") ? (
              <SelectField
                label="Twitter card"
                value={form.twitterCard}
                onChange={(value) => update("twitterCard", value)}
                options={[
                  { value: "summary_large_image", label: "Large image" },
                  { value: "summary", label: "Compact summary" },
                ]}
              />
            ) : null}
          </div>
        </section>
      ) : null}
      {has("robotsDirective") || features["schemaJsonLd"] !== "disabled" ? (
        <section className="rounded-lg border border-slate-800 bg-[#0b1826]">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between p-5 text-left"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                <Code2 className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-base font-bold">Advanced SEO</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Indexing directives and structured data.
                </span>
              </span>
            </span>
            <ChevronRight
              className={`h-4 w-4 text-slate-500 transition ${showAdvanced ? "rotate-90" : ""}`}
            />
          </button>
          {showAdvanced ? (
            <div className="space-y-5 border-t border-slate-800 p-5">
              {features["robotsDirective"] === "basic" ? (
                <p className="text-xs text-slate-400">
                  This plan uses the standard index and follow directive.
                </p>
              ) : has("robotsDirective") ? (
                <SelectField
                  label="Robots directive"
                  value={form.robots}
                  onChange={(value) => update("robots", value)}
                  options={[
                    { value: "index, follow", label: "Index page and follow links" },
                    { value: "noindex, follow", label: "Hide page, follow links" },
                    ...(features["robotsDirective"] === "advanced"
                      ? [
                          { value: "index, nofollow", label: "Index page, ignore links" },
                          { value: "noindex, nofollow", label: "Hide page and ignore links" },
                        ]
                      : []),
                  ]}
                />
              ) : null}
              {features["schemaJsonLd"] === "basic_presets" ? (
                <SchemaPreset value={form.schema} onChange={(value) => update("schema", value)} />
              ) : features["schemaJsonLd"] === "custom_json_ld" ? (
                <>
                  <SeoField
                    label="JSON-LD structured data"
                    value={form.schema}
                    onChange={(value) => update("schema", value)}
                    placeholder={
                      '{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness"\n}'
                    }
                    multiline
                    code
                  />
                  {form.schema && !isValidJson(form.schema) ? (
                    <p className="flex items-center gap-2 text-xs text-red-300">
                      <AlertCircle className="h-4 w-4" />
                      Structured data is not valid JSON.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function SitemapSection({
  pages,
  draft,
  setDraft,
}: {
  pages: PageOption[];
  draft: Partial<EditorState>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<EditorState>>>;
}) {
  const sitemap = { ...EMPTY_SITEMAP, ...draft.sitemap };
  const update = (next: typeof sitemap) => setDraft((current) => ({ ...current, sitemap: next }));
  return (
    <section className="rounded-lg border border-slate-800 bg-[#0b1826]">
      <SectionHeading
        icon={<Globe2 className="h-5 w-5" />}
        title="Sitemap"
        detail="Control which pages search engines discover."
        tone="emerald"
      />
      <div className="divide-y divide-slate-800">
        {pages.map((page) => {
          const included = !sitemap.excludedPageIds.includes(page.id);
          return (
            <div key={page.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_100px_130px]">
              <label className="flex items-center gap-3 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={included}
                  onChange={(event) =>
                    update({
                      ...sitemap,
                      excludedPageIds: event.target.checked
                        ? sitemap.excludedPageIds.filter((id) => id !== page.id)
                        : [...sitemap.excludedPageIds, page.id],
                    })
                  }
                  className="h-4 w-4 accent-cyan-400"
                />
                <span>
                  <span className="block font-semibold">{page.label}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{page.route}</span>
                </span>
              </label>
              <input
                aria-label={`${page.label} sitemap priority`}
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={sitemap.priorities[page.id] ?? 0.5}
                onChange={(event) =>
                  update({
                    ...sitemap,
                    priorities: { ...sitemap.priorities, [page.id]: Number(event.target.value) },
                  })
                }
                className="h-9 rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-xs"
              />
              <select
                aria-label={`${page.label} change frequency`}
                value={sitemap.changefreq[page.id] ?? "weekly"}
                onChange={(event) =>
                  update({
                    ...sitemap,
                    changefreq: { ...sitemap.changefreq, [page.id]: event.target.value },
                  })
                }
                className="h-9 rounded-lg border border-slate-700 bg-slate-950/30 px-2 text-xs"
              >
                {CHANGE_FREQUENCIES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function IntegrationSection({
  draft,
  setDraft,
  features,
}: {
  draft: Partial<EditorState>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<EditorState>>>;
  features: Record<string, boolean | string>;
}) {
  const patch = (key: "googleVerification" | "searchConsole" | "googleAnalytics", value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <section className="rounded-lg border border-slate-800 bg-[#0b1826]">
      <SectionHeading
        icon={<Search className="h-5 w-5" />}
        title="Search and analytics"
        detail="Publish verification metadata and analytics tags."
        tone="cyan"
      />
      <div className="space-y-5 p-5">
        {featureEnabled(features["googleVerification"]) ? (
          <SeoField
            label="Google site verification token"
            value={draft.googleVerification ?? ""}
            onChange={(value) => patch("googleVerification", value)}
            placeholder="Verification token only"
            hint="Paste the content value supplied by Google, not the full meta tag."
          />
        ) : null}
        {featureEnabled(features["searchConsoleIntegration"]) ? (
          <SeoField
            label="Search Console verification token"
            value={draft.searchConsole ?? ""}
            onChange={(value) => patch("searchConsole", value)}
            placeholder="Search Console verification token"
            hint="This publishes the verification metadata required to claim the site property."
          />
        ) : null}
        {featureEnabled(features["googleAnalytics"]) ? (
          <SeoField
            label="Google Analytics measurement ID"
            value={draft.googleAnalytics ?? ""}
            onChange={(value) => patch("googleAnalytics", value.toUpperCase())}
            placeholder="G-XXXXXXXXXX or GTM-XXXXXXX"
          />
        ) : null}
      </div>
    </section>
  );
}

function RedirectSection({
  redirects,
  onChange,
}: {
  redirects: RedirectRule[];
  onChange: (redirects: RedirectRule[]) => void;
}) {
  const patch = (index: number, key: keyof RedirectRule, value: string) =>
    onChange(
      redirects.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, [key]: value } : rule)),
    );
  return (
    <section className="rounded-lg border border-slate-800 bg-[#0b1826]">
      <div className="flex items-center justify-between border-b border-slate-800 p-5">
        <div>
          <h2 className="font-display text-base font-bold">301 redirects</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Send retired public paths to active pages.
          </p>
        </div>
        <button
          type="button"
          title="Add redirect"
          onClick={() => onChange([...redirects, { from: "", to: "" }])}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 p-5">
        {redirects.length ? (
          redirects.map((rule, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_40px]">
              <input
                aria-label={`Redirect ${index + 1} source`}
                value={rule.from}
                onChange={(event) => patch(index, "from", event.target.value)}
                placeholder="/old-path"
                className="h-10 rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-xs"
              />
              <input
                aria-label={`Redirect ${index + 1} target`}
                value={rule.to}
                onChange={(event) => patch(index, "to", event.target.value)}
                placeholder="/new-path or https://..."
                className="h-10 rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-xs"
              />
              <button
                type="button"
                title="Delete redirect"
                onClick={() => onChange(redirects.filter((_, ruleIndex) => ruleIndex !== index))}
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-red-400/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">No redirect rules configured.</p>
        )}
      </div>
    </section>
  );
}

function Custom404Section({
  pages,
  pageId,
  onChange,
}: {
  pages: PageOption[];
  pageId: string;
  onChange: (pageId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#0b1826] p-5">
      <SelectField
        label="Custom not-found page"
        value={pageId}
        onChange={onChange}
        options={[
          { value: "", label: "Default not-found response" },
          ...pages.map((page) => ({ value: page.id, label: `${page.label} (${page.route})` })),
        ]}
      />
    </section>
  );
}

function SectionHeading({
  icon,
  title,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: "cyan" | "violet" | "emerald";
}) {
  const color =
    tone === "violet"
      ? "bg-violet-400/10 text-violet-300"
      : tone === "emerald"
        ? "bg-emerald-400/10 text-emerald-300"
        : "bg-cyan-400/10 text-cyan-300";
  return (
    <div className="border-b border-slate-800 p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </span>
        <div>
          <h2 className="font-display text-base font-bold">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function SeoField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
  multiline,
  inputMode,
  code,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  multiline?: boolean;
  inputMode?: "url";
  code?: boolean;
}) {
  const lengthTone = maxLength && value.length > maxLength ? "text-red-300" : "text-slate-500";
  const classes = `mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2.5 text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 ${code ? "font-mono leading-5" : ""}`;
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        {maxLength ? (
          <span className={`text-[10px] ${lengthTone}`}>
            {value.length} / {maxLength}
          </span>
        ) : null}
      </span>
      {multiline ? (
        <textarea
          rows={code ? 7 : 4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${classes} resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className={`${classes} h-10`}
        />
      )}
      {hint ? (
        <span className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-4 text-slate-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-xs text-slate-200 outline-none focus:border-cyan-400"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchPreview({ form, websiteName }: { form: SeoForm; websiteName: string }) {
  const url = form.canonical || "https://www.example.com/";
  return (
    <div className="rounded-lg bg-white p-4 text-slate-900">
      <p className="truncate text-xs text-emerald-700">{url}</p>
      <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab]">{form.title || websiteName}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">
        {form.description || "Add a meta description to show searchers what this page offers."}
      </p>
    </div>
  );
}
function SocialPreview({ form, websiteName }: { form: SeoForm; websiteName: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
      {form.ogImage ? (
        <img
          src={form.ogImage}
          alt="Social preview"
          className="aspect-[1.91/1] w-full object-cover"
        />
      ) : (
        <div className="grid aspect-[1.91/1] place-items-center bg-slate-800 text-slate-600">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}
      <div className="p-3">
        <p className="text-[10px] uppercase text-slate-500">{hostnameOf(form.canonical)}</p>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-200">
          {form.ogTitle || form.title || websiteName}
        </p>
        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">
          {form.ogDescription || form.description || "Add a description for social sharing."}
        </p>
      </div>
    </div>
  );
}
function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "text-emerald-300" : score >= 45 ? "text-amber-300" : "text-red-300";
  return (
    <div
      className={`grid h-12 w-12 place-items-center rounded-full border-4 border-slate-700 font-display text-xs font-bold ${color}`}
    >
      {score}
    </div>
  );
}
function AuditRow({ label, detail, status }: AuditItem) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-slate-950/25 p-2.5">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${status === "pass" ? "bg-emerald-400 text-slate-950" : "bg-amber-400/15 text-amber-300"}`}
      >
        {status === "pass" ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      </span>
      <span>
        <span className="block text-[11px] font-medium text-slate-300">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{detail}</span>
      </span>
    </div>
  );
}
function PreviewButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={`${label} preview`}
      aria-label={`${label} preview`}
      onClick={onClick}
      className={`rounded-md p-2 transition ${active ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-200"}`}
    >
      {icon}
    </button>
  );
}

type AuditItem = { label: string; detail: string; status: "pass" | "warning" };
function buildAudit(form: SeoForm, entitlements?: SeoEntitlements): AuditItem[] {
  const features = entitlements?.seoFeatures ?? {};
  const checks: Array<[string, AuditItem]> = [
    [
      "pageTitle",
      {
        label: "Page title",
        detail:
          form.title.length >= 30 && form.title.length <= 60
            ? "Title length is optimized."
            : "Use a title between 30 and 60 characters.",
        status: form.title.length >= 30 && form.title.length <= 60 ? "pass" : "warning",
      },
    ],
    [
      "metaDescription",
      {
        label: "Meta description",
        detail:
          form.description.length >= 120 && form.description.length <= 160
            ? "Description length is optimized."
            : "Use a description between 120 and 160 characters.",
        status:
          form.description.length >= 120 && form.description.length <= 160 ? "pass" : "warning",
      },
    ],
    [
      "canonicalUrl",
      {
        label: "Canonical URL",
        detail: isHttpUrl(form.canonical)
          ? "A valid preferred URL is set."
          : "Add a complete HTTPS canonical URL.",
        status: isHttpUrl(form.canonical) ? "pass" : "warning",
      },
    ],
    [
      "socialImage",
      {
        label: "Social image",
        detail: form.ogImage
          ? "Social sharing has a visual preview."
          : "Add a 1200 x 630 social image.",
        status: form.ogImage ? "pass" : "warning",
      },
    ],
    [
      "robotsDirective",
      {
        label: "Indexing",
        detail: form.robots.startsWith("index")
          ? "Search engines may index this page."
          : "This page is currently hidden from search.",
        status: form.robots.startsWith("index") ? "pass" : "warning",
      },
    ],
    [
      "schemaJsonLd",
      {
        label: "Structured data",
        detail:
          form.schema && isValidJson(form.schema)
            ? "Valid JSON-LD is configured."
            : "Add valid JSON-LD for richer results.",
        status: form.schema && isValidJson(form.schema) ? "pass" : "warning",
      },
    ],
  ];
  return checks.filter(([key]) => featureEnabled(features[key])).map(([, item]) => item);
}

function SchemaPreset({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const presets = {
    "": "",
    LocalBusiness: JSON.stringify(
      { "@context": "https://schema.org", "@type": "LocalBusiness" },
      null,
      2,
    ),
    Organization: JSON.stringify(
      { "@context": "https://schema.org", "@type": "Organization" },
      null,
      2,
    ),
    WebSite: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite" }, null, 2),
  };
  const selected = Object.entries(presets).find(([, schema]) => schema === value)?.[0] ?? "";
  return (
    <SelectField
      label="Structured data preset"
      value={selected}
      onChange={(key) => onChange(presets[key as keyof typeof presets])}
      options={Object.keys(presets).map((key) => ({ value: key, label: key || "None" }))}
    />
  );
}

function buildPageOptions(htmlContent?: string, pages?: Array<{ name: string }>): PageOption[] {
  const sources = [...(htmlContent ? [{ name: "index.html" }] : []), ...(pages ?? [])];
  return sources.map((page, index) => ({
    id: `page-${index}`,
    label: index === 0 ? "Home" : pageLabel(page.name, index),
    route: routeFromPageName(page.name, index),
  }));
}
function pageLabel(name: string, index: number) {
  const cleaned = name
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\.html?$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return cleaned ? cleaned.replace(/\b\w/g, (value) => value.toUpperCase()) : `Page ${index + 1}`;
}
function routeFromPageName(name: string, index: number) {
  if (index === 0) return "/";
  const cleaned = name
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/")
    .replace(/\.html?$/i, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "")
    .toLowerCase();
  return cleaned ? `/${cleaned}` : `/page-${index}`;
}
function normalizeLegacyHomepageSeo(state: Partial<EditorState>) {
  const seo = { ...(state.seo ?? {}) };
  if (!seo["page-0"]) seo["page-0"] = seo["index"] ?? seo["page1"] ?? seo["home"] ?? {};
  delete seo["index"];
  delete seo["page1"];
  delete seo["home"];
  return { ...state, seo };
}
function seoFormFrom(value?: Partial<SeoData>): SeoForm {
  return { ...EMPTY_SEO, ...value, schema: typeof value?.schema === "string" ? value.schema : "" };
}
function featureEnabled(value: boolean | string | undefined) {
  return value === true || ![undefined, false, "disabled"].includes(value);
}
function isValidJson(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
function hostnameOf(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "example.com";
  }
}
function LoadingState() {
  return (
    <div className="grid min-h-96 place-items-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-300" />
        <p className="mt-3 text-xs text-slate-500">Loading SEO settings</p>
      </div>
    </div>
  );
}
function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="grid min-h-96 place-items-center rounded-lg border border-slate-800 bg-[#0b1826] text-center">
      <div>
        <AlertCircle className="mx-auto h-8 w-8 text-red-300" />
        <h2 className="mt-3 font-display text-base font-bold">Unable to load SEO settings</h2>
        <p className="mt-2 text-xs text-slate-500">{message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
function NoWebsite() {
  return (
    <div className="grid min-h-[60vh] place-items-center rounded-lg border border-dashed border-slate-700 bg-[#0b1826]/60 text-center">
      <div>
        <Sparkles className="mx-auto h-10 w-10 text-slate-600" />
        <h1 className="mt-4 font-display text-xl font-bold">Create a website first</h1>
        <p className="mt-2 text-sm text-slate-500">
          SEO settings are managed separately for each website.
        </p>
      </div>
    </div>
  );
}
