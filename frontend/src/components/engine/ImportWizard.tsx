import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileCode2,
  FileUp,
  Images,
  LayoutTemplate,
  Layers,
  Link2,
  MousePointerClick,
  Rows3,
  Search,
  Sparkles,
  Type,
  Video,
  X,
  Loader2,
  Palette,
} from "lucide-react";
import { analyzeTemplate } from "@/lib/template-engine/parser";
import type { EditableField, TemplateAnalysis } from "@/lib/template-engine/types";
import { Btn, Chip, ConfidenceChip, EmptyState, Panel, SectionTitle } from "./ui";
import { cn } from "@/lib/utils";

const STEPS = [
  "Get your website files ready",
  "Find pages and website files",
  "Read each page",
  "Find text and pictures you can change",
  "Find repeated lists",
  "Find menus and forms",
  "Find colours and fonts",
  "Check for missing website files",
  "Prepare your review",
  "Open your website editor",
];

/* ------------------------------- guide modal ------------------------------ */

export function ImportGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cols: { title: string; items: string[] }[] = [
    {
      title: "Website files you can use",
      items: [
        "Website pages saved as files",
        "Single-page and multi-page websites",
        "Website layouts with their styling files",
        "Websites with interactive parts",
        "Responsive designs",
      ],
    },
    {
      title: "What WebMintra finds for you",
      items: [
        "Text content and headings",
        "Images, videos and SVG",
        "Links, buttons and CTAs",
        "Forms and validation copy",
        "Navigation and menus",
        "Repeated lists and groups of cards",
        "Search result details",
        "Colours and fonts",
        "Assets and page hierarchy",
      ],
    },
    {
      title: "Before you begin",
      items: [
        "Use clear page headings and sections",
        "Keep structures clean and consistent",
        "Group repeated content with identical markup",
        "Give every image meaningful alt text",
        "Avoid using the same page label twice",
        "Stay responsive at every breakpoint",
        "Use meaningful class names",
        "Keep navigation consistent across pages",
        "Ship all referenced assets in the package",
        "Let JavaScript degrade gracefully",
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-md">
      <Panel className="fade-up relative max-h-[88vh] w-full max-w-4xl overflow-y-auto shadow-panel">
        <button
          onClick={onClose}
          aria-label="Close guide"
          className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="border-b border-border p-7">
          <Chip tone="primary">
            <BookOpen className="h-3 w-3" /> Guide
          </Chip>
          <h2 className="mt-3 text-2xl font-bold">How bringing in a website works</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Choose the files for an existing website. WebMintra checks each page, finds the parts
            you can update, and lets you review everything before you start editing.
          </p>
        </div>
        <div className="grid gap-7 p-7 md:grid-cols-3">
          {cols.map((c) => (
            <div key={c.title}>
              <SectionTitle>{c.title}</SectionTitle>
              <ul className="space-y-2">
                {c.items.map((i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Check className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-7">
          <SectionTitle hint="WebMintra guides every step">What happens next</SectionTitle>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-elevated/60 px-3 py-2.5"
              >
                <span className="text-primary grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/12 font-mono text-[11px] font-bold">
                  {i + 1}
                </span>
                <span className="text-xs font-medium">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-accent/25 bg-accent/8 p-4">
            <Sparkles className="text-accent mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="text-foreground font-semibold">Review suggestions.</span> WebMintra
              shows how sure it is about each item it found. You can keep, change, or remove any
              suggestion before you begin editing.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export interface TemplateMetadataInput {
  title: string;
  category: string;
  description: string;
  thumbnailUrl: string;
}

export function ImportWizard({
  categories = [],
  onComplete,
}: {
  categories?: { _id: string; name: string }[];
  onComplete: (a: TemplateAnalysis, meta?: TemplateMetadataInput) => void;
}) {
  const [stage, setStage] = useState<Stage>("upload");
  const [step, setStep] = useState(0);
  const [guide, setGuide] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);
  const [disabled, setDisabled] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"summary" | "detections" | "assets" | "validation">("summary");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (
    files: { name: string; content: string }[],
    assetNames: string[],
    name: string,
  ) => {
    if (!files.length) {
      setError("No HTML pages found in that selection. Include at least one .html file.");
      return;
    }
    setError("");
    setStage("processing");
    try {
      for (let i = 0; i < STEPS.length - 2; i++) {
        setStep(i);
        await new Promise((r) => setTimeout(r, 200));
      }
      const result = analyzeTemplate(files, assetNames, name);
      setStep(STEPS.length - 2);
      await new Promise((r) => setTimeout(r, 200));
      setAnalysis(result);
      setStage("report");
    } catch (err: any) {
      console.error("Template analysis error:", err);
      setError(err?.message || "Failed to analyze HTML file structure.");
      setStage("upload");
    }
  };

  const onFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const html: { name: string; content: string }[] = [];
    const assets: string[] = [];
    for (const f of files) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      if (/\.html?$/i.test(f.name))
        html.push({ name: rel.split("/").slice(-1)[0] ?? f.name, content: await f.text() });
      else assets.push(rel);
    }
    void run(html, assets, files.length ? "Uploaded website" : "Website");
  };

  if (guide) return <ImportGuideModal onClose={() => setGuide(false)} />;

  if (stage === "processing") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-bold text-[#ea580c]">
            <Layers className="h-3.5 w-3.5" /> Analyzing Template
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-[#0b192c]">
            Inspecting your HTML code
          </h2>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Detecting pages, typography, editable elements, forms, repeaters, and theme tokens.
          </p>

          <div className="mt-6 space-y-2">
            {STEPS.slice(0, STEPS.length - 1).map((s, i) => (
              <div
                key={s}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all duration-200",
                  i < step
                    ? "border-[#e2e8f0] bg-[#f8fafc] text-[#059669]"
                    : i === step
                      ? "border-[#fed7aa] bg-[#fff7ed] text-[#ea580c] shadow-2xs ring-1 ring-[#fed7aa]"
                      : "border-[#f1f5f9] bg-white text-[#94a3b8]",
                )}
              >
                {i < step ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#059669]" />
                ) : i === step ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#ea580c]" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#cbd5e1]" />
                )}
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
            <div
              className="h-full rounded-full bg-[#059669] transition-all duration-300 shadow-xs"
              style={{ width: `${((step + 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (stage === "report" && analysis) {
    return (
      <ImportReport
        analysis={analysis}
        categories={categories}
        disabled={disabled}
        setDisabled={setDisabled}
        tab={tab}
        setTab={setTab}
        onBack={() => {
          setAnalysis(null);
          setStage("upload");
        }}
        onConfirm={(meta) => {
          const cleaned: TemplateAnalysis = {
            ...analysis,
            name: meta.title || analysis.name,
            pages: analysis.pages.map((p) => ({
              ...p,
              fields: p.fields.map((f) => ({ ...f, enabled: !disabled[`${p.id}:${f.id}`] })),
            })),
          };
          onComplete(cleaned, meta);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-6 sm:px-10 py-10 w-full">
      <div className="fade-up mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#0b192c]">Import Template</h1>
        <p className="mt-1 text-xs font-medium text-[#64748b]">
          Upload your HTML file and we'll extract editable content automatically.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "fade-up relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-24 text-center transition-all duration-300 shadow-xs",
          dragging
            ? "border-[#ea580c] bg-[#fff7ed] shadow-md ring-2 ring-[#ea580c]/20"
            : "border-[#cbd5e1] bg-white hover:bg-[#f8fafc] hover:border-[#ea580c]",
        )}
      >
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-[#fed7aa] bg-[#fff7ed] text-[#ea580c] shadow-2xs">
          <FileUp className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-[#0b192c]">Drag & drop your HTML file here</h3>
        <p className="mt-1 text-xs font-medium text-[#64748b]">or click to browse</p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#059669] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
          >
            Choose HTML File
          </button>
        </div>

        <p className="mt-8 text-[11px] font-medium text-[#94a3b8]">
          We support HTML files up to 50MB
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void onFiles(e.target.files)}
        />
        {error ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-3 py-1.5 text-xs font-semibold text-[#e11d48]">
            <CircleAlert className="h-3.5 w-3.5" /> {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------- report --------------------------------- */

export function ImportReport({
  analysis,
  categories = [],
  disabled,
  setDisabled,
  tab,
  setTab,
  onBack,
  onConfirm,
}: {
  analysis: TemplateAnalysis;
  categories?: { _id: string; name: string }[];
  disabled: Record<string, boolean>;
  setDisabled: (d: Record<string, boolean>) => void;
  tab: "summary" | "detections" | "assets" | "validation";
  setTab: (t: "summary" | "detections" | "assets" | "validation") => void;
  onBack: () => void;
  onConfirm: (meta: TemplateMetadataInput) => void;
}) {
  const [query, setQuery] = useState("");
  const [pageId, setPageId] = useState(analysis.pages[0]?.id ?? "");
  const page = analysis.pages.find((p) => p.id === pageId) ?? analysis.pages[0];

  // Metadata form state
  const [metaTitle, setMetaTitle] = useState(analysis.name || "Imported Template");
  const [metaCategory, setMetaCategory] = useState(categories[0]?.name || "Landing Page");
  const [metaDescription, setMetaDescription] = useState(
    `Modern website template containing ${analysis.pages.length} page(s) with ${analysis.stats["Editable fields"] || 0} editable content blocks.`,
  );
  const [metaThumbnailUrl, setMetaThumbnailUrl] = useState("");

  // Sync meta category once categories load
  useEffect(() => {
    if (categories.length > 0 && (!metaCategory || metaCategory === "Landing Page")) {
      setMetaCategory(categories[0].name);
    }
  }, [categories]);

  const fields = useMemo(() => {
    const list = page?.fields ?? [];
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((f) => `${f.label} ${f.value} ${f.kind} ${f.tag}`.toLowerCase().includes(q));
  }, [page, query]);

  const errors = analysis.issues.filter((i) => i.severity === "error");
  const warnings = analysis.issues.filter((i) => i.severity === "warning");
  const infos = analysis.issues.filter((i) => i.severity === "info");

  const statIcon: Record<string, typeof Type> = {
    Pages: FileCode2,
    "Editable fields": Type,
    Repeaters: Rows3,
    Images: Images,
    Videos: Video,
    Links: Link2,
    Assets: Layers,
  };

  const handleConfirmClick = () => {
    onConfirm({
      title: metaTitle.trim() || analysis.name || "Imported Template",
      category: metaCategory || categories[0]?.name || "Landing Page",
      description: metaDescription.trim(),
      thumbnailUrl: metaThumbnailUrl.trim(),
    });
  };

  return (
    <div className="mx-auto max-w-[1500px] px-6 sm:px-10 py-8">
      <div className="fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-0.5 text-[11px] font-bold text-[#047857]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Parsed successfully
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[#0b192c]">Import Report</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            {metaTitle || analysis.name} · {analysis.pages.length} page(s) ·{" "}
            {analysis.stats["Editable fields"]} editable fields detected
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc]"
          >
            Start over
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#059669] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
          >
            Confirm import <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Key Metric Highlights */}
      <div className="fade-up mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          {
            label: "Pages",
            val: analysis.stats["Pages"] ?? analysis.pages.length,
            icon: FileCode2,
            color: "text-[#0ea5e9]",
            bg: "bg-[#f0f9ff]",
            border: "border-[#bae6fd]",
          },
          {
            label: "Editable Fields",
            val: analysis.stats["Editable fields"] ?? 0,
            icon: Type,
            color: "text-[#ea580c]",
            bg: "bg-[#fff7ed]",
            border: "border-[#fed7aa]",
          },
          {
            label: "Repeaters",
            val: analysis.stats["Repeaters"] ?? 0,
            icon: Rows3,
            color: "text-[#8b5cf6]",
            bg: "bg-[#f5f3ff]",
            border: "border-[#ddd6fe]",
          },
          {
            label: "Images",
            val: analysis.stats["Images"] ?? 0,
            icon: Images,
            color: "text-[#059669]",
            bg: "bg-[#ecfdf5]",
            border: "border-[#a7f3d0]",
          },
          {
            label: "Forms & CTAs",
            val: (analysis.stats["Forms"] ?? 0) + (analysis.stats["CTA buttons"] ?? 0),
            icon: MousePointerClick,
            color: "text-[#3b82f6]",
            bg: "bg-[#eff6ff]",
            border: "border-[#bfdbfe]",
          },
          {
            label: "Theme Tokens",
            val: analysis.stats["Theme tokens"] ?? 0,
            icon: Palette,
            color: "text-[#d97706]",
            bg: "bg-[#fffbeb]",
            border: "border-[#fde68a]",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-xs transition hover:border-[#cbd5e1]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748b] truncate">{card.label}</span>
                <div
                  className={`grid h-7 w-7 place-items-center rounded-lg border ${card.border} ${card.bg} ${card.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-2 text-xl font-black tracking-tight text-[#0b192c]">{card.val}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#e2e8f0] pb-3">
        {(
          [
            ["summary", "Overview & Theme"],
            ["detections", `Editable Fields (${page?.fields.length ?? 0})`],
            ["assets", `Assets (${analysis.assets.length})`],
            ["validation", `Health Check (${analysis.issues.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-bold transition shadow-2xs",
              tab === id
                ? "bg-[#0b192c] text-white shadow-xs"
                : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0b192c] hover:bg-[#f8fafc]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <div className="fade-up mt-5 grid gap-5 lg:grid-cols-2">
          {/* Left Column: Template Metadata & Pages */}
          <div className="space-y-5">
            {/* Metadata Form */}
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5 border-b border-[#f1f5f9] pb-2.5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b192c]">
                    Template Metadata &amp; Catalog Details
                  </h3>
                  <p className="text-[11px] font-medium text-[#64748b] mt-0.5">
                    Customize how this template appears in the admin catalog.
                  </p>
                </div>
                <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
                  Required
                </span>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] mb-1">
                      Template Title *
                    </label>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder="e.g. Aura Event Studio"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3 text-xs font-semibold text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:bg-white focus:ring-2 focus:ring-[#ea580c]/10"
                    />
                    <p className="mt-1 text-[10px] font-medium text-[#64748b]">
                      Auto-detected from HTML title &amp; heading. You can modify it.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] mb-1">
                      Business Category *
                    </label>
                    <div className="relative">
                      {categories.length > 0 ? (
                        <select
                          value={metaCategory}
                          onChange={(e) => setMetaCategory(e.target.value)}
                          className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3 text-xs font-semibold text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:bg-white focus:ring-2 focus:ring-[#ea580c]/10 cursor-pointer"
                        >
                          {categories.map((c) => (
                            <option key={c._id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={metaCategory}
                          onChange={(e) => setMetaCategory(e.target.value)}
                          className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3 text-xs font-semibold text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:bg-white focus:ring-2 focus:ring-[#ea580c]/10 cursor-pointer"
                        >
                          <option value="Landing Page">Landing Page</option>
                          <option value="Portfolio & Photography">
                            Portfolio &amp; Photography
                          </option>
                          <option value="Agency & Business">Agency &amp; Business</option>
                          <option value="Restaurant & Cafe">Restaurant &amp; Cafe</option>
                          <option value="Clinic & Healthcare">Clinic &amp; Healthcare</option>
                          <option value="E-Commerce">E-Commerce</option>
                          <option value="Real Estate">Real Estate</option>
                        </select>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-[#64748b]">
                      Select the category this template belongs to.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Brief summary of template layout, target niche, and features..."
                    className="w-full rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-2.5 text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:bg-white focus:ring-2 focus:ring-[#ea580c]/10"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    Thumbnail Image URL (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={metaThumbnailUrl}
                      onChange={(e) => setMetaThumbnailUrl(e.target.value)}
                      placeholder="https://example.com/preview.jpg"
                      className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3 text-xs font-mono text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:bg-white focus:ring-2 focus:ring-[#ea580c]/10"
                    />
                    {metaThumbnailUrl ? (
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#cbd5e1] shadow-2xs">
                        <img
                          src={metaThumbnailUrl}
                          alt="Thumbnail preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Detected Pages ({analysis.pages.length})
                </h3>
                <span className="text-[11px] font-medium text-[#64748b]">Ready for router</span>
              </div>
              <div className="space-y-2.5">
                {analysis.pages.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-bold text-[#0b192c]">
                        {p.title || p.name}
                      </p>
                      {p.isHome ? (
                        <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
                          Home Page
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[10px] font-medium text-[#64748b]">
                      {p.name} → {p.route}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="rounded-md border border-[#cbd5e1] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                        {p.fields.length} fields
                      </span>
                      <span className="rounded-md border border-[#cbd5e1] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                        {p.repeaters.length} repeaters
                      </span>
                      <span className="rounded-md border border-[#cbd5e1] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                        {p.forms.length} forms
                      </span>
                      {p.linksTo?.length ? (
                        <span className="rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-semibold text-[#047857]">
                          links to {p.linksTo.join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Repeaters &amp; Dynamic Collections
                </h3>
                <span className="text-[11px] font-medium text-[#64748b]">Auto-bound</span>
              </div>
              <div className="space-y-2">
                {analysis.pages.flatMap((p) =>
                  p.repeaters.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#0b192c]">{r.label}</p>
                        <p className="text-[11px] font-medium text-[#64748b]">
                          {p.name} · {r.itemIds.length} items · ~{r.fieldsPerItem} fields each
                        </p>
                      </div>
                      <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
                        {r.confidence}
                      </span>
                    </div>
                  )),
                )}
                {analysis.pages.flatMap((p) =>
                  p.forms.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#0b192c]">{f.label}</p>
                        <p className="text-[11px] font-medium text-[#64748b]">
                          {p.name} · {f.fields.length} inputs · submit “{f.submitLabel}”
                        </p>
                      </div>
                      <span className="rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                        {f.confidence}
                      </span>
                    </div>
                  )),
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Theme & Design System */}
          <div className="space-y-5">
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Extracted Color Palette
                </h3>
                <span className="text-[11px] font-medium text-[#64748b]">CSS Variables</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {Object.entries(analysis.theme || {})
                  .filter(([, v]) => String(v ?? "").startsWith("#"))
                  .map(([k, v]) => {
                    const hex = String(v);
                    return (
                      <div
                        key={k}
                        className="flex flex-col rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5 shadow-2xs transition hover:bg-white"
                      >
                        <div
                          className="h-10 w-full rounded-lg border border-[#cbd5e1] shadow-2xs mb-2"
                          style={{ background: hex }}
                        />
                        <p className="text-[11px] font-bold text-[#0b192c] capitalize">{k}</p>
                        <p className="font-mono text-[10px] font-semibold text-[#64748b] uppercase">
                          {hex}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Typography &amp; Layout Tokens
                </h3>
                <span className="text-[11px] font-medium text-[#64748b]">Computed</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Heading Font", val: analysis.theme?.fontHeading || "System / Sans" },
                  { label: "Body Font", val: analysis.theme?.fontBody || "System / Sans" },
                  { label: "Border Radius", val: analysis.theme?.radius || "12px" },
                  { label: "Container Max Width", val: analysis.theme?.container || "1140px" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 shadow-2xs"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#0b192c] truncate">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "detections" ? (
        <div className="fade-up mt-5 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 shadow-2xs">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search detections…"
                className="h-9 w-full bg-transparent text-xs font-medium text-[#0b192c] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
            {analysis.pages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPageId(p.id)}
                className={cn(
                  "h-8 rounded-lg px-3 text-xs font-bold transition shadow-2xs",
                  p.id === pageId
                    ? "bg-[#ea580c] text-white"
                    : "border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="mb-3 text-[11px] font-medium text-[#64748b]">
            Review each detection before import. Uncheck anything that should not be editable.
          </p>
          <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {fields.map((f) => {
              const key = `${page?.id}:${f.id}`;
              const off = disabled[key];
              return (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 transition shadow-2xs",
                    off && "opacity-45",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setDisabled({ ...disabled, [key]: !off })}
                    aria-label={off ? "Enable detection" : "Disable detection"}
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition",
                      off
                        ? "border-[#cbd5e1] bg-white"
                        : "border-[#059669] bg-[#059669] text-white",
                    )}
                  >
                    {off ? null : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#0b192c]">{f.label}</p>
                    <p className="truncate text-[11px] font-medium text-[#64748b]">
                      {f.value || "—"}
                    </p>
                  </div>
                  <code className="hidden shrink-0 rounded-md border border-[#e2e8f0] bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-[#475569] sm:block">
                    &lt;{f.tag}&gt;
                  </code>
                  <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
                    {f.confidence}
                  </span>
                </div>
              );
            })}
            {fields.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-[#64748b]">
                No detections matched your search.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "assets" ? (
        <div className="fade-up mt-5 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              Assets Found
            </h3>
            <span className="text-[11px] font-medium text-[#64748b]">
              {analysis.assets.filter((a) => a.missing).length} missing ·{" "}
              {analysis.assets.filter((a) => a.duplicateOf).length} duplicates
            </span>
          </div>
          <div className="grid max-h-[26rem] gap-2 overflow-y-auto pr-1">
            {analysis.assets.map((a) => (
              <div
                key={a.url}
                className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 shadow-2xs"
              >
                <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c] uppercase">
                  {a.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#0b192c]">{a.name}</p>
                  <p className="truncate font-mono text-[10px] text-[#64748b]">{a.url}</p>
                </div>
                <span className="hidden text-[11px] font-medium text-[#64748b] sm:block">
                  used on {a.usedOn.join(", ")}
                </span>
                {a.missing ? (
                  <span className="rounded-md border border-[#fecdd3] bg-[#fff1f2] px-2 py-0.5 text-[10px] font-bold text-[#e11d48]">
                    missing
                  </span>
                ) : (
                  <span className="rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                    ok
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "validation" ? (
        <div className="fade-up mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Errors", errors.length, "bg-[#fff1f2] border-[#fecdd3] text-[#e11d48]"],
              ["Warnings", warnings.length, "bg-[#fff7ed] border-[#fed7aa] text-[#c2410c]"],
              ["Suggestions", infos.length, "bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]"],
            ].map(([label, count, style]) => (
              <div
                key={label as string}
                className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-xs"
              >
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${style}`}
                >
                  {label as string}
                </span>
                <p className="font-display mt-2 text-2xl font-black text-[#0b192c]">
                  {count as number}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#475569]">
              Validation Report
            </h3>
            <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
              {analysis.issues.map((i) => (
                <div
                  key={i.id}
                  className="flex gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 shadow-2xs"
                >
                  {i.severity === "error" ? (
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#e11d48]" />
                  ) : i.severity === "warning" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ea580c]" />
                  ) : (
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0b192c]">{i.message}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-[#64748b]">{i.fix}</p>
                  </div>
                  <span className="rounded-md border border-[#cbd5e1] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                    {i.category}
                  </span>
                </div>
              ))}
              {analysis.issues.length === 0 ? (
                <div className="py-8 text-center text-xs font-medium text-[#059669]">
                  ✓ This template passed every validation rule.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
