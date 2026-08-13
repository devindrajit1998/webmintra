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
} from "lucide-react";
import { analyzeTemplate } from "@/lib/template-engine/parser";
import { SAMPLE_ASSET_NAMES, SAMPLE_TEMPLATE_FILES } from "@/lib/template-engine/sample";
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
            Choose the files for an existing website. WebMintra checks each page, finds the parts you can update, and lets you
            review everything before you start editing.
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
              <li key={s} className="flex items-center gap-2.5 rounded-lg border border-border bg-elevated/60 px-3 py-2.5">
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
              <span className="text-foreground font-semibold">Review suggestions.</span> WebMintra shows how sure it is about
              each item it found. You can keep, change, or remove any suggestion before you begin editing.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- wizard --------------------------------- */

type Stage = "upload" | "processing" | "report";

export function ImportWizard({ onComplete }: { onComplete: (a: TemplateAnalysis) => void }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [step, setStep] = useState(0);
  const [guide, setGuide] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);
  const [disabled, setDisabled] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"summary" | "detections" | "assets" | "validation">("summary");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (files: { name: string; content: string }[], assetNames: string[], name: string) => {
    if (!files.length) {
      setError("No HTML pages found in that selection. Include at least one .html file.");
      return;
    }
    setError("");
    setStage("processing");
    for (let i = 0; i < STEPS.length - 2; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 260));
    }
    const result = analyzeTemplate(files, assetNames, name);
    setStep(STEPS.length - 2);
    await new Promise((r) => setTimeout(r, 300));
    setAnalysis(result);
    setStage("report");
  };

  const onFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const html: { name: string; content: string }[] = [];
    const assets: string[] = [];
    for (const f of files) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      if (/\.html?$/i.test(f.name)) html.push({ name: rel.split("/").slice(-1)[0] ?? f.name, content: await f.text() });
      else assets.push(rel);
    }
    void run(html, assets, files.length ? "Uploaded website" : "Website");
  };

  if (guide) return <ImportGuideModal onClose={() => setGuide(false)} />;

  if (stage === "processing") {
    return (
      <div className="mx-auto max-w-2xl py-20">
        <Panel className="fade-up p-8 shadow-panel">
          <Chip tone="primary">
            <Layers className="h-3 w-3" /> Importing
          </Chip>
          <h2 className="mt-3 text-xl font-bold">Checking your website</h2>
          <p className="mt-1 text-sm text-muted-foreground">Finding pages, pictures, links, and the parts you can update.</p>
          <div className="mt-7 space-y-2.5">
            {STEPS.slice(0, STEPS.length - 1).map((s, i) => (
              <div
                key={s}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all",
                  i < step
                    ? "border-border bg-elevated/50 text-muted-foreground"
                    : i === step
                      ? "border-primary/40 bg-primary/8 text-foreground"
                      : "border-border/60 text-muted-foreground/50",
                )}
              >
                {i < step ? (
                  <CheckCircle2 className="text-success h-4 w-4 shrink-0" />
                ) : i === step ? (
                  <span className="border-primary border-t-transparent h-4 w-4 shrink-0 animate-spin rounded-full border-2" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                )}
                <span className="font-medium">{s}</span>
              </div>
            ))}
          </div>
          <div className="sweep mt-7 h-1.5 rounded-full bg-elevated">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </Panel>
      </div>
    );
  }

  if (stage === "report" && analysis) {
    return (
      <ImportReport
        analysis={analysis}
        disabled={disabled}
        setDisabled={setDisabled}
        tab={tab}
        setTab={setTab}
        onBack={() => {
          setAnalysis(null);
          setStage("upload");
        }}
        onConfirm={() => {
          const cleaned: TemplateAnalysis = {
            ...analysis,
            pages: analysis.pages.map((p) => ({
              ...p,
              fields: p.fields.map((f) => ({ ...f, enabled: !disabled[`${p.id}:${f.id}`] })),
            })),
          };
          onComplete(cleaned);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 w-full">
      <div className="fade-up mb-8 text-left">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Import Template
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
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
          "fade-up relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-20 text-center transition-all duration-300",
          dragging ? "border-cyan-500 bg-cyan-500/10 shadow-glow" : "border-slate-700 bg-[#0b1826] hover:bg-slate-900 hover:border-cyan-500/50"
        )}
      >
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-400">
          <FileUp className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">Drag & drop your HTML file here</h3>
        <p className="mt-1 text-sm text-slate-400">or click to browse</p>
        
        <div className="mt-6 flex flex-col items-center gap-4">
          <Btn variant="primary" onClick={() => inputRef.current?.click()}>
            Choose HTML File
          </Btn>
          <button onClick={() => void run(SAMPLE_TEMPLATE_FILES, SAMPLE_ASSET_NAMES, "Northwind Studio")} className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition">
            Or try an example website
          </button>
        </div>
        
        <p className="mt-8 text-xs text-slate-500">
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
          <p className="text-destructive mt-5 inline-flex items-center gap-2 text-xs font-semibold">
            <CircleAlert className="h-3.5 w-3.5" /> {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------- report --------------------------------- */

function ImportReport({
  analysis,
  disabled,
  setDisabled,
  tab,
  setTab,
  onBack,
  onConfirm,
}: {
  analysis: TemplateAnalysis;
  disabled: Record<string, boolean>;
  setDisabled: (d: Record<string, boolean>) => void;
  tab: "summary" | "detections" | "assets" | "validation";
  setTab: (t: "summary" | "detections" | "assets" | "validation") => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pageId, setPageId] = useState(analysis.pages[0]?.id ?? "");
  const page = analysis.pages.find((p) => p.id === pageId) ?? analysis.pages[0];

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

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <Chip tone="success">
            <CheckCircle2 className="h-3 w-3" /> Parsed successfully
          </Chip>
          <h1 className="mt-3 text-3xl font-bold">Import report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {analysis.name} · {analysis.pages.length} pages · {analysis.stats["Editable fields"]} editable fields detected
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onBack}>
            Start over
          </Btn>
          <Btn variant="primary" onClick={onConfirm}>
            Confirm import <ChevronRight className="h-4 w-4" />
          </Btn>
        </div>
      </div>

      <div className="fade-up mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(analysis.stats).map(([k, v]) => {
          const Icon = statIcon[k] ?? Sparkles;
          return (
            <Panel key={k} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{k}</span>
                <Icon className={cn("h-3.5 w-3.5", k === "Errors" ? "text-destructive" : "text-primary")} />
              </div>
              <p className={cn("font-display mt-2 text-2xl font-bold", k === "Errors" && v > 0 && "text-destructive")}>{v}</p>
            </Panel>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ["summary", "Summary"],
            ["detections", `Detections (${page?.fields.length ?? 0})`],
            ["assets", `Assets (${analysis.assets.length})`],
            ["validation", `Validation (${analysis.issues.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-xs font-semibold transition",
              tab === id ? "border-primary bg-primary/12 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <div className="fade-up mt-5 grid gap-4 lg:grid-cols-2">
          <Panel className="p-5">
            <SectionTitle hint="Detected hierarchy">Pages found</SectionTitle>
            <div className="space-y-2">
              {analysis.pages.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-elevated/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    {p.isHome ? <Chip tone="primary">Home</Chip> : null}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {p.name} → {p.route}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip>{p.fields.length} fields</Chip>
                    <Chip>{p.repeaters.length} repeaters</Chip>
                    <Chip>{p.forms.length} forms</Chip>
                    <Chip>{p.navGroups.length} menus</Chip>
                    {p.linksTo.length ? <Chip tone="accent">links to {p.linksTo.join(", ")}</Chip> : null}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel className="p-5">
              <SectionTitle hint="Extracted from CSS">Theme variables</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(analysis.theme).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 rounded-lg border border-border bg-elevated/50 px-2.5 py-2">
                    {v.startsWith("#") ? (
                      <span className="h-5 w-5 shrink-0 rounded border border-border" style={{ background: v }} />
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold">{k}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">{v}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="p-5">
              <SectionTitle>Repeaters &amp; forms</SectionTitle>
              <div className="space-y-2">
                {analysis.pages.flatMap((p) =>
                  p.repeaters.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-elevated/50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{r.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.name} · {r.itemIds.length} items · ~{r.fieldsPerItem} fields each
                        </p>
                      </div>
                      <ConfidenceChip level={r.confidence} />
                    </div>
                  )),
                )}
                {analysis.pages.flatMap((p) =>
                  p.forms.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-elevated/50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{f.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.name} · {f.fields.length} inputs · submit “{f.submitLabel}”
                        </p>
                      </div>
                      <ConfidenceChip level={f.confidence} />
                    </div>
                  )),
                )}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "detections" ? (
        <Panel className="fade-up mt-5 p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-border bg-background/60 px-3">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search detections…"
                className="h-9 w-full bg-transparent text-xs outline-none"
              />
            </div>
            {analysis.pages.map((p) => (
              <Btn key={p.id} size="sm" variant={p.id === pageId ? "primary" : "default"} onClick={() => setPageId(p.id)}>
                {p.name}
              </Btn>
            ))}
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Review each detection before import. Uncheck anything that should not be editable.
          </p>
          <div className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
            {fields.map((f) => {
              const key = `${page?.id}:${f.id}`;
              const off = disabled[key];
              return (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border bg-elevated/40 px-3 py-2.5 transition",
                    off && "opacity-45",
                  )}
                >
                  <button
                    onClick={() => setDisabled({ ...disabled, [key]: !off })}
                    aria-label={off ? "Enable detection" : "Disable detection"}
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded border transition",
                      off ? "border-border" : "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {off ? null : <Check className="h-3 w-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{f.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{f.value || "—"}</p>
                  </div>
                  <code className="hidden shrink-0 rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
                    &lt;{f.tag}&gt;
                  </code>
                  {f.inRepeater ? <Chip tone="accent">repeater</Chip> : null}
                  <ConfidenceChip level={f.confidence} />
                </div>
              );
            })}
            {fields.length === 0 ? (
              <EmptyState icon={<Search className="h-5 w-5" />} title="No detections match" body="Try a different search term or switch page." />
            ) : null}
          </div>
        </Panel>
      ) : null}

      {tab === "assets" ? (
        <Panel className="fade-up mt-5 p-5">
          <SectionTitle hint={`${analysis.assets.filter((a) => a.missing).length} missing · ${analysis.assets.filter((a) => a.duplicateOf).length} duplicates`}>
            Assets found
          </SectionTitle>
          <div className="grid max-h-[26rem] gap-1.5 overflow-y-auto pr-1">
            {analysis.assets.map((a) => (
              <div key={a.url} className="flex items-center gap-3 rounded-lg border border-border bg-elevated/40 px-3 py-2.5">
                <Chip tone="primary">{a.kind}</Chip>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{a.name}</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{a.url}</p>
                </div>
                <span className="hidden text-[11px] text-muted-foreground sm:block">used on {a.usedOn.join(", ")}</span>
                {a.duplicateOf ? <Chip tone="warning">duplicate</Chip> : null}
                {a.missing ? <Chip tone="danger">missing</Chip> : <Chip tone="success">ok</Chip>}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {tab === "validation" ? (
        <div className="fade-up mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Errors", errors.length, "danger"],
              ["Warnings", warnings.length, "warning"],
              ["Suggestions", infos.length, "primary"],
            ].map(([label, count, tone]) => (
              <Panel key={label as string} className="p-4">
                <Chip tone={tone as "danger"}>{label as string}</Chip>
                <p className="font-display mt-2 text-2xl font-bold">{count as number}</p>
              </Panel>
            ))}
          </div>
          <Panel className="p-5">
            <SectionTitle hint="Severity and suggested fix">Validation report</SectionTitle>
            <div className="max-h-[24rem] space-y-1.5 overflow-y-auto pr-1">
              {analysis.issues.map((i) => (
                <div key={i.id} className="flex gap-3 rounded-lg border border-border bg-elevated/40 px-3 py-2.5">
                  {i.severity === "error" ? (
                    <CircleAlert className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
                  ) : i.severity === "warning" ? (
                    <AlertTriangle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <Sparkles className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{i.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{i.fix}</p>
                  </div>
                  <Chip className="ml-auto self-start">{i.category}</Chip>
                </div>
              ))}
              {analysis.issues.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Nothing to fix" body="This template passed every validation rule." />
              ) : null}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
