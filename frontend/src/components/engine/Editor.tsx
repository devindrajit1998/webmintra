import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Boxes,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
  Eye,
  EyeOff,
  History,
  Image as ImageIcon,
  Laptop,
  Layers,
  Link2,
  ListTree,
  Monitor,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  Rows3,
  Save,
  Search,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Type,
  Undo2,
  Video as VideoIcon,
} from "lucide-react";
import { toast } from "sonner";
import { renderPage, defaultRepeaterItems } from "@/lib/template-engine/render";
import type {
  EditableField,
  EditorState,
  ElementEdit,
  TemplateAnalysis,
  ThemeTokens,
} from "@/lib/template-engine/types";
import { FONTAWESOME_CATEGORIES } from "@/lib/template-engine/fontawesome-icons";
import {
  Btn,
  Chip,
  ColorInput,
  ConfidenceChip,
  EmptyState,
  Panel,
  SectionTitle,
  Slider,
  TextInput,
  Toggle,
} from "./ui";
import { cn } from "@/lib/utils";

const DEVICES = [
  { id: "desktop", label: "Desktop", w: 1440, icon: Monitor },
  { id: "laptop", label: "Laptop", w: 1280, icon: Laptop },
  { id: "tablet", label: "Tablet", w: 834, icon: Tablet },
  { id: "mobile-l", label: "Large mobile", w: 430, icon: Smartphone },
  { id: "mobile-s", label: "Small mobile", w: 360, icon: Smartphone },
] as const;

type RightTab =
  "element" | "repeaters" | "theme" | "assets" | "seo" | "nav" | "validation" | "history";

const baseId = (id: string) => (id.includes("::") ? (id.split("::")[1] ?? id) : id);
const itemKeyOf = (id: string) => (id.includes("::") ? (id.split("::")[0] ?? "") : "");

export function Editor({
  analysis,
  initialState,
  entitlements,
  onExit,
  onSaveDraft,
  onPublish,
  onUploadImage,
}: {
  analysis: TemplateAnalysis;
  initialState?: Partial<EditorState> | undefined;
  entitlements?: Record<string, boolean | string> | undefined;
  onExit: () => void;
  onSaveDraft?: (state: EditorState) => void;
  onPublish?: (state: EditorState) => void;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const initial: EditorState = useMemo(
    () => ({
      edits: initialState?.edits ?? {},
      repeaters:
        initialState?.repeaters ??
        Object.fromEntries(
          analysis.pages.flatMap((p) =>
            p.repeaters.map((r) => [r.id, defaultRepeaterItems(r.itemIds)]),
          ),
        ),
      theme: initialState?.theme ?? analysis.theme,
      themes: initialState?.themes ?? [{ name: "Imported theme", tokens: analysis.theme }],
      seo: initialState?.seo ?? {},
      globalSeo: initialState?.globalSeo,
      sitemap: initialState?.sitemap,
      googleVerification: initialState?.googleVerification,
      searchConsole: initialState?.searchConsole,
      googleAnalytics: initialState?.googleAnalytics,
      redirects: initialState?.redirects,
      custom404: initialState?.custom404,
    }),
    [analysis, initialState],
  );

  const [history, setHistory] = useState<EditorState[]>([initial]);
  const [cursor, setCursor] = useState(0);
  const state = history[cursor] ?? initial;

  const [pageId, setPageId] = useState(analysis.pages[0]?.id ?? "");
  const page = analysis.pages.find((p) => p.id === pageId) ?? analysis.pages[0]!;
  const [selected, setSelected] = useState<string | null>(null);
  const [device, setDevice] = useState<string>("desktop");
  const [customWidth, setCustomWidth] = useState(1440);
  const [landscape, setLandscape] = useState(false);
  const [zoom, setZoom] = useState(0.62);
  const [tab, setTab] = useState<RightTab>("element");
  const [treeQuery, setTreeQuery] = useState("");
  const [revisions, setRevisions] = useState<{ label: string; at: string; state: EditorState }[]>(
    [],
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const previewScrollRef = useRef<{ x: number; y: number } | null>(null);

  const preservePreviewScroll = () => {
    const previewWindow = frameRef.current?.contentWindow;
    if (!previewWindow) return;
    previewScrollRef.current = { x: previewWindow.scrollX, y: previewWindow.scrollY };
  };

  const commit = useCallback(
    (next: EditorState) => {
      setHistory((h) => [...h.slice(0, cursor + 1).slice(-60), next]);
      setCursor((c) => Math.min(c + 1, 60));
    },
    [cursor],
  );

  const editOf = (id: string): ElementEdit => state.edits[page.id]?.[id] ?? {};
  const patch = (id: string, p: ElementEdit) => {
    preservePreviewScroll();
    const pageEdits = { ...(state.edits[page.id] ?? {}) };
    const prev = pageEdits[id] ?? {};
    pageEdits[id] = { ...prev, ...p, style: { ...(prev.style ?? {}), ...(p.style ?? {}) } };
    commit({ ...state, edits: { ...state.edits, [page.id]: pageEdits } });
  };
  const replaceAsset = (url: string, src: string) => {
    preservePreviewScroll();
    const edits = { ...state.edits };
    let replaced = 0;
    analysis.pages.forEach((assetPage) => {
      const matchingFields = assetPage.fields.filter(
        (field) => field.value === url && ["image", "video"].includes(field.kind),
      );
      if (!matchingFields.length) return;
      const pageEdits = { ...(edits[assetPage.id] ?? {}) };
      matchingFields.forEach((field) => {
        pageEdits[field.id] = { ...(pageEdits[field.id] ?? {}), src };
        replaced += 1;
      });
      edits[assetPage.id] = pageEdits;
    });
    if (replaced) commit({ ...state, edits });
  };
  const setTheme = (t: Partial<ThemeTokens>) =>
    commit({ ...state, theme: { ...state.theme, ...t } });

  const addRepeaterItem = useCallback(
    (repeaterId: string, requestedSourceIndex = 0) => {
      const repeater = page.repeaters.find((candidate) => candidate.id === repeaterId);
      if (!repeater) return;
      const items = state.repeaters[repeater.id] ?? defaultRepeaterItems(repeater.itemIds);
      const sourceIndex =
        Number.isInteger(requestedSourceIndex) &&
        requestedSourceIndex >= 0 &&
        requestedSourceIndex < repeater.itemIds.length
          ? requestedSourceIndex
          : 0;
      const key = `c${Date.now()}-${items.length}`;

      preservePreviewScroll();
      commit({
        ...state,
        repeaters: {
          ...state.repeaters,
          [repeater.id]: [...items, { key, srcIndex: sourceIndex }],
        },
      });
      setSelected(`${key}::${repeater.itemIds[sourceIndex] ?? repeater.itemIds[0]}`);
      setTab("repeaters");
    },
    [commit, page.repeaters, state],
  );

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data;
      if (!d || d.source !== "te") return;
      if (d.type === "select") {
        setSelected(d.id);
        setTab("element");
      }
      if (d.type === "text") patch(d.id, { text: String(d.value ?? "") });
      if (d.type === "repeater-add" && typeof d.repeaterId === "string") {
        addRepeaterItem(d.repeaterId, Number(d.sourceIndex));
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [addRepeaterItem, patch]);

  useEffect(() => {
    const t = setTimeout(() => setSavedAt(new Date().toLocaleTimeString()), 900);
    return () => clearTimeout(t);
  }, [history, cursor]);

  const srcDoc = useMemo(
    () => renderPage(analysis, page, state, { interactive: true }),
    [analysis, page, state],
  );

  const focusInPreview = (id: string) => {
    setSelected(id);
    frameRef.current?.contentWindow?.postMessage({ source: "te-host", type: "focus", id }, "*");
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const field: EditableField | undefined = selected
    ? page.fields.find((f) => f.id === baseId(selected))
    : undefined;

  const deviceWidth =
    device === "custom" ? customWidth : (DEVICES.find((d) => d.id === device)?.w ?? 1440);
  const frameWidth = landscape && deviceWidth < 900 ? Math.round(deviceWidth * 1.9) : deviceWidth;

  const download = () => {
    const html = renderPage(analysis, page, state);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = page.name;
    a.click();
    URL.revokeObjectURL(a.href);
    flash(`Downloaded ${page.name}`);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* top bar */}
      <header className="z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-2.5 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onExit}
            className="flex min-w-0 items-center gap-2"
            title="Choose another website"
          >
            <span className="text-primary grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/12">
              W
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold">WebMintra</span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {analysis.name} ·{" "}
                {savedAt ? `Last saved at ${savedAt}` : "Changes saved automatically"}{" "}
                {published ? "· Live" : ""}
              </span>
            </span>
          </button>
          <div className="hidden gap-1 lg:flex">
            {analysis.pages.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPageId(p.id);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                  p.id === pageId
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Btn
            size="icon"
            variant="ghost"
            title="Undo"
            disabled={cursor === 0}
            onClick={() => setCursor((c) => c - 1)}
          >
            <Undo2 className="h-4 w-4" />
          </Btn>
          <Btn
            size="icon"
            variant="ghost"
            title="Redo"
            disabled={cursor >= history.length - 1}
            onClick={() => setCursor((c) => c + 1)}
          >
            <Redo2 className="h-4 w-4" />
          </Btn>
          <Btn size="icon" variant="ghost" title="Export page HTML" onClick={download}>
            <Download className="h-4 w-4" />
          </Btn>
          <Btn
            size="sm"
            onClick={() => {
              setRevisions((r) => [
                { label: `Revision ${r.length + 1}`, at: new Date().toLocaleString(), state },
                ...r,
              ]);
              if (onSaveDraft) onSaveDraft(state);
              flash("Version saved");
            }}
          >
            <Save className="h-3.5 w-3.5" /> Save a version
          </Btn>
          <Btn
            size="sm"
            variant="primary"
            onClick={() => {
              const errs = analysis.issues.filter((i) => i.severity === "error").length;
              if (errs) {
                setTab("validation");
                flash(
                  `Fix ${errs} important issue${errs === 1 ? "" : "s"} before making changes live`,
                );
                return;
              }
              setPublished(true);
              if (onPublish) onPublish(state);
              flash("Your changes are live");
            }}
          >
            Make changes live
          </Btn>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* left: structure */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/60 lg:flex">
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={treeQuery}
                onChange={(e) => setTreeQuery(e.target.value)}
                placeholder="Find something on this page"
                className="h-8 w-full bg-transparent text-xs outline-none"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <SectionTitle hint={page.name}>Page contents</SectionTitle>
            {treeQuery ? (
              <div className="space-y-1">
                {page.fields
                  .filter((f) =>
                    `${f.label} ${f.value}`.toLowerCase().includes(treeQuery.toLowerCase()),
                  )
                  .slice(0, 60)
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => focusInPreview(f.id)}
                      className="block w-full truncate rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-elevated hover:text-foreground"
                    >
                      {f.label} · {f.value.slice(0, 28) || f.tag}
                    </button>
                  ))}
              </div>
            ) : (
              <TreeView nodes={page.tree} onSelect={focusInPreview} selected={selected} />
            )}
          </div>
        </aside>

        {/* center: preview */}
        <main className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
              {DEVICES.map((d) => (
                <button
                  key={d.id}
                  title={`${d.label} · ${d.w}px`}
                  onClick={() => setDevice(d.id)}
                  className={cn(
                    "grid h-7 w-8 place-items-center rounded-md transition",
                    device === d.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <d.icon className={cn("h-3.5 w-3.5", d.id === "mobile-s" && "scale-75")} />
                </button>
              ))}
              <button
                onClick={() => setDevice("custom")}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-semibold transition",
                  device === "custom"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Set width
              </button>
            </div>
            {device === "custom" ? (
              <input
                type="number"
                value={customWidth}
                min={280}
                max={2200}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-xs outline-none"
              />
            ) : null}
            <Btn
              size="sm"
              variant={landscape ? "primary" : "default"}
              onClick={() => setLandscape(!landscape)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> {landscape ? "Landscape" : "Portrait"}
            </Btn>
            <div className="ml-auto flex items-center gap-2">
              <Chip>{frameWidth}px</Chip>
              <div className="w-28">
                <Slider
                  label="Zoom"
                  min={30}
                  max={110}
                  value={Math.round(zoom * 100)}
                  unit="%"
                  onChange={(v) => setZoom(v / 100)}
                />
              </div>
            </div>
          </div>
          <div className="surface-grid min-h-0 flex-1 overflow-auto p-6">
            <div className="mx-auto" style={{ width: frameWidth * zoom }}>
              <div
                className="overflow-hidden rounded-xl border border-border bg-white shadow-panel"
                style={{
                  width: frameWidth,
                  height: 1000,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                <iframe
                  ref={frameRef}
                  title="Live preview"
                  srcDoc={srcDoc}
                  onLoad={() => {
                    const scroll = previewScrollRef.current;
                    if (!scroll) return;
                    frameRef.current?.contentWindow?.scrollTo(scroll.x, scroll.y);
                    previewScrollRef.current = null;
                  }}
                  className="h-full w-full border-0"
                />
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Select something on the page to change it. Double-click text to type directly on the
              page.
            </p>
          </div>
        </main>

        {/* right: property panel */}
        <aside className="hidden w-[22rem] shrink-0 flex-col border-l border-border bg-card/60 xl:flex">
          <div className="flex flex-wrap gap-1 border-b border-border p-2">
            {(
              [
                ["element", Type],
                ["repeaters", Rows3],
                ["theme", Palette],
                ["assets", ImageIcon],
                ["seo", Sparkles],
                ["nav", Link2],
                ["validation", CircleAlert],
                ["history", History],
              ] as [RightTab, typeof Type][]
            ).map(([id, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                title={id}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg transition",
                  tab === id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-elevated",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "element" ? (
              <ElementPanel
                selected={selected}
                field={field}
                edit={selected ? editOf(selected) : {}}
                patch={patch}
                onUploadImage={onUploadImage}
                canEditAltText={
                  entitlements === undefined ||
                  entitlements["imageAltText"] === "enabled" ||
                  entitlements["imageAltText"] === true
                }
              />
            ) : null}
            {tab === "repeaters" ? (
              <RepeaterPanel
                page={page}
                state={state}
                commit={commit}
                focus={focusInPreview}
                editOf={editOf}
                patch={patch}
                addItem={addRepeaterItem}
              />
            ) : null}
            {tab === "theme" ? (
              <ThemePanel state={state} setTheme={setTheme} commit={commit} analysis={analysis} />
            ) : null}
            {tab === "assets" ? (
              <AssetPanel analysis={analysis} state={state} onReplace={replaceAsset} />
            ) : null}
            {tab === "seo" ? (
              <SeoPanel
                seo={{ ...page.seo, ...(state.seo[page.id] ?? {}) }}
                onChange={(k, v) =>
                  commit({
                    ...state,
                    seo: { ...state.seo, [page.id]: { ...(state.seo[page.id] ?? {}), [k]: v } },
                  })
                }
              />
            ) : null}
            {tab === "nav" ? (
              <NavPanel page={page} editOf={editOf} patch={patch} focus={focusInPreview} />
            ) : null}
            {tab === "validation" ? (
              <ValidationPanel analysis={analysis} focus={focusInPreview} />
            ) : null}
            {tab === "history" ? (
              <HistoryPanel
                revisions={revisions}
                cursor={cursor}
                length={history.length}
                onRestore={(s) => {
                  commit(s);
                  flash("Revision restored");
                }}
              />
            ) : null}
          </div>
        </aside>
      </div>

      {toast ? (
        <div className="fade-up fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-primary/30 bg-card px-4 py-2.5 text-xs font-semibold shadow-panel">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------- panels --------------------------------- */

function TreeView({
  nodes,
  onSelect,
  selected,
  depth = 0,
}: {
  nodes: { id: string; label: string; kind: string; children: unknown[] }[];
  onSelect: (id: string) => void;
  selected: string | null;
  depth?: number;
}) {
  return (
    <ul className={cn(depth > 0 && "ml-2.5 border-l border-border/70 pl-2")}>
      {nodes.map((n) => (
        <li key={n.id + n.label}>
          <button
            onClick={() => onSelect(n.id)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-[11px] transition",
              selected === n.id
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-elevated hover:text-foreground",
            )}
          >
            {n.kind === "repeater" ? (
              <Rows3 className="h-3 w-3 shrink-0" />
            ) : n.kind === "item" ? (
              <Boxes className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">{n.label}</span>
          </button>
          {n.children.length ? (
            <TreeView
              nodes={
                n.children as { id: string; label: string; kind: string; children: unknown[] }[]
              }
              onSelect={onSelect}
              selected={selected}
              depth={depth + 1}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function FontAwesomeIconPicker({
  selectedClass,
  onChange,
}: {
  selectedClass: string;
  onChange: (className: string) => void;
}) {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState(selectedClass);

  useEffect(() => {
    setCustomInput(selectedClass);
  }, [selectedClass]);

  const allIcons = useMemo(() => {
    return Object.entries(FONTAWESOME_CATEGORIES).flatMap(([cat, icons]) =>
      icons.map((icon) => ({ ...icon, category: cat })),
    );
  }, []);

  const filteredIcons = useMemo(() => {
    return allIcons.filter((icon) => {
      const matchesCategory = category === "All" || icon.category === category;
      const matchesSearch =
        !search ||
        icon.name.toLowerCase().includes(search.toLowerCase()) ||
        icon.class.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allIcons, category, search]);

  // Extract core fa class for clean icon rendering in the picker UI
  const getCleanFaClass = (rawClass: string) => {
    const parts = rawClass.split(/\s+/).filter(Boolean);
    const faPrefix =
      parts.find((p) =>
        /^(fa-solid|fa-regular|fa-brands|fa-light|fa-thin|fa-duotone|fa|fas|far|fab)$/i.test(p),
      ) || "fa-solid";
    const faIcon =
      parts.find(
        (p) =>
          /^fa-[a-z0-9-]+$/i.test(p) &&
          !/^(fa-solid|fa-regular|fa-brands|fa-light|fa-thin|fa-duotone|fa-2x|fa-3x|fa-4x|fa-5x|fa-lg|fa-sm|fa-xs|fa-fw|fa-spin)$/i.test(
            p,
          ),
      ) || "fa-star";
    return `${faPrefix} ${faIcon}`;
  };

  const previewClass = getCleanFaClass(selectedClass);

  return (
    <div className="space-y-3">
      <SectionTitle hint="FontAwesome">Icon Selection</SectionTitle>

      {/* Live Preview Box */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-elevated/60 p-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary text-2xl">
          <i className={previewClass} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">Current Icon</p>
          <p className="font-mono text-[11px] text-muted-foreground truncate">{selectedClass}</p>
        </div>
      </div>

      {/* Category Dropdown */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
        >
          <option value="All">All Categories ({allIcons.length} icons)</option>
          {Object.keys(FONTAWESOME_CATEGORIES).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Search Input */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Search Icons
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g., star, phone, twitter, cart..."
          className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Icon Grid */}
      <div className="space-y-1">
        <label className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>Choose Icon ({filteredIcons.length})</span>
        </label>
        <div className="grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto rounded-lg border border-border bg-card/50 p-2">
          {filteredIcons.map((icon) => {
            const isSelected = selectedClass.includes(icon.class) || selectedClass === icon.class;
            return (
              <button
                key={icon.class + icon.name}
                type="button"
                title={`${icon.name} (${icon.class})`}
                onClick={() => {
                  // Preserve existing non-FA utility classes like text-brand-400, size classes, etc.
                  const extraClasses = selectedClass
                    .split(/\s+/)
                    .filter((c) => !/^(fa[srbldt]?|fa-[a-z0-9-]+)$/i.test(c))
                    .join(" ");
                  const combined = extraClasses ? `${icon.class} ${extraClasses}` : icon.class;
                  onChange(combined);
                  setCustomInput(combined);
                }}
                className={cn(
                  "flex h-10 flex-col items-center justify-center rounded-md border border-border/60 text-base text-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary",
                  isSelected && "border-primary bg-primary/20 text-primary ring-1 ring-primary",
                )}
              >
                <i className={icon.class} />
              </button>
            );
          })}
          {filteredIcons.length === 0 && (
            <div className="col-span-5 py-6 text-center text-xs text-muted-foreground">
              No matching icons found.
            </div>
          )}
        </div>
      </div>

      {/* Custom Icon Class override */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Custom Class Name
        </label>
        <div className="flex gap-2">
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="fa-solid fa-heart"
            className="h-8 flex-1 rounded-lg border border-border bg-background px-2 font-mono text-xs text-foreground outline-none focus:border-primary"
          />
          <Btn
            size="sm"
            onClick={() => {
              if (customInput.trim()) onChange(customInput.trim());
            }}
          >
            Apply
          </Btn>
        </div>
      </div>
    </div>
  );
}

function StyleControls({
  edit,
  patch,
  id,
}: {
  edit: ElementEdit;
  patch: (id: string, p: ElementEdit) => void;
  id: string;
}) {
  const s = edit.style ?? {};
  const num = (key: string, fallback: number) => parseFloat(String(s[key] ?? fallback));
  const set = (key: string, value: string) => patch(id, { style: { [key]: value } });
  return (
    <div className="space-y-3">
      <SectionTitle>Layout &amp; style</SectionTitle>
      <div className="grid grid-cols-3 gap-1">
        {[
          ["left", AlignLeft],
          ["center", AlignCenter],
          ["right", AlignRight],
        ].map(([v, Icon]) => (
          <button
            key={v as string}
            onClick={() => set("text-align", v as string)}
            className={cn(
              "grid h-8 place-items-center rounded-lg border border-border transition hover:border-primary/40",
              s["text-align"] === v && "border-primary bg-primary/12 text-primary",
            )}
          >
            {}
            {(() => {
              const I = Icon as typeof AlignLeft;
              return <I className="h-3.5 w-3.5" />;
            })()}
          </button>
        ))}
      </div>
      <Slider
        label="Padding"
        min={0}
        max={80}
        value={num("padding", 0)}
        onChange={(v) => set("padding", `${v}px`)}
      />
      <Slider
        label="Margin top"
        min={-40}
        max={80}
        value={num("margin-top", 0)}
        onChange={(v) => set("margin-top", `${v}px`)}
      />
      <Slider
        label="Border radius"
        min={0}
        max={48}
        value={num("border-radius", 0)}
        onChange={(v) => set("border-radius", `${v}px`)}
      />
      <Slider
        label="Opacity"
        min={10}
        max={100}
        value={num("opacity", 1) <= 1 ? num("opacity", 1) * 100 : num("opacity", 100)}
        unit="%"
        onChange={(v) => set("opacity", String(v / 100))}
      />
      <Slider
        label="Font size"
        min={10}
        max={72}
        value={num("font-size", 16)}
        onChange={(v) => set("font-size", `${v}px`)}
      />
      <Slider
        label="Letter spacing"
        min={-3}
        max={8}
        step={0.5}
        value={num("letter-spacing", 0)}
        onChange={(v) => set("letter-spacing", `${v}px`)}
      />
      <Slider
        label="Width"
        min={10}
        max={100}
        unit="%"
        value={num("width", 100)}
        onChange={(v) => set("width", `${v}%`)}
      />
      <ColorInput
        label="Text color"
        value={String(s["color"] ?? "#0f172a")}
        onChange={(v) => set("color", v)}
      />
      <ColorInput
        label="Background"
        value={String(s["background-color"] ?? "#ffffff")}
        onChange={(v) => set("background-color", v)}
      />
      <TextInput
        label="Gradient / overlay"
        value={String(s["background-image"] ?? "")}
        placeholder="linear-gradient(90deg,#0ea5a4,#f59e0b)"
        onChange={(v) => set("background-image", v)}
      />
      <TextInput
        label="Box shadow"
        value={String(s["box-shadow"] ?? "")}
        placeholder="0 20px 40px -20px rgba(0,0,0,.4)"
        onChange={(v) => set("box-shadow", v)}
      />
      <TextInput
        label="Animation"
        value={String(s["animation"] ?? "")}
        placeholder="te-fade 600ms ease both"
        onChange={(v) => set("animation", v)}
      />
      <Toggle
        label="Hidden on page"
        checked={!!edit.hidden}
        onChange={(v) => patch(id, { hidden: v })}
      />
    </div>
  );
}

function ElementPanel({
  selected,
  field,
  edit,
  patch,
  onUploadImage,
  canEditAltText,
}: {
  selected: string | null;
  field?: EditableField | undefined;
  edit: ElementEdit;
  patch: (id: string, p: ElementEdit) => void;
  onUploadImage: ((file: File) => Promise<string>) | undefined;
  canEditAltText: boolean;
}) {
  if (!selected) {
    return (
      <EmptyState
        icon={<Type className="h-5 w-5" />}
        title="No element selected"
        body="Click any element in the live preview to open its contextual properties. Double-click text to edit inline."
      />
    );
  }
  const kind = field?.kind ?? "description";
  const itemKey = itemKeyOf(selected);
  return (
    <div className="fade-up space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Chip tone="primary">{field?.label ?? "Element"}</Chip>
          {field ? <ConfidenceChip level={field.confidence} /> : null}
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          &lt;{field?.tag ?? "div"}&gt; · {selected}
          {itemKey ? ` · repeater item ${itemKey}` : ""}
        </p>
      </div>

      {[
        "title",
        "subtitle",
        "description",
        "longtext",
        "richtext",
        "quote",
        "caption",
        "badge",
        "number",
        "currency",
        "date",
      ].includes(kind) ? (
        <div className="space-y-3">
          <SectionTitle>Content</SectionTitle>
          <TextInput
            label={field?.label ?? "Text"}
            multiline={["longtext", "richtext", "description", "quote"].includes(kind)}
            value={edit.text ?? field?.value ?? ""}
            onChange={(v) => patch(selected, { text: v })}
          />
        </div>
      ) : null}

      {kind === "image" ? (
        <div className="space-y-3">
          <SectionTitle hint={field?.role}>Image</SectionTitle>
          <ImagePreview
            src={edit.src ?? field?.value ?? ""}
            alt={edit.alt ?? field?.attrs["alt"] ?? field?.label ?? "Image preview"}
          />
          <TextInput
            label="Source URL"
            value={edit.src ?? field?.value ?? ""}
            onChange={(v) => patch(selected, { src: v })}
          />
          <label className="block cursor-pointer rounded-lg border border-dashed border-border px-3 py-3 text-center text-[11px] font-semibold text-muted-foreground transition hover:border-primary/50">
            Replace with local image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  // Show optimistic loading state or just wait
                  if (onUploadImage) {
                    try {
                      toast.loading("Uploading image...", { id: "upload" });
                      const url = await onUploadImage(f);
                      patch(selected, { src: url });
                      toast.success("Image uploaded", { id: "upload" });
                    } catch (err) {
                      toast.error("Failed to upload image", { id: "upload" });
                    }
                  } else {
                    const reader = new FileReader();
                    reader.onload = () => {
                      patch(selected, { src: reader.result as string });
                    };
                    reader.readAsDataURL(f);
                  }
                }
                e.target.value = "";
              }}
            />
          </label>
          {canEditAltText ? (
            <TextInput
              label="Alt text"
              value={edit.alt ?? field?.attrs["alt"] ?? ""}
              onChange={(v) => patch(selected, { alt: v })}
            />
          ) : null}
          <TextInput
            label="Title attribute"
            value={edit.title ?? ""}
            onChange={(v) => patch(selected, { title: v })}
          />
          <TextInput
            label="Focal point (object-position)"
            value={edit.style?.["object-position"] ?? ""}
            placeholder="50% 30%"
            onChange={(v) =>
              patch(selected, { style: { "object-position": v, "object-fit": "cover" } })
            }
          />
          <Toggle
            label="Lazy loading"
            checked={(edit.loading ?? field?.attrs["loading"]) === "lazy"}
            onChange={(v) => patch(selected, { loading: v ? "lazy" : "eager" })}
          />
        </div>
      ) : null}

      {kind === "video" ? (
        <div className="space-y-3">
          <SectionTitle hint={field?.role}>Video</SectionTitle>
          <TextInput
            label="Source"
            value={edit.src ?? field?.value ?? ""}
            onChange={(v) => patch(selected, { src: v })}
          />
          <TextInput
            label="Thumbnail / poster"
            value={edit.poster ?? field?.attrs["poster"] ?? ""}
            onChange={(v) => patch(selected, { poster: v })}
          />
          <Toggle
            label="Autoplay"
            checked={!!edit.autoplay}
            onChange={(v) => patch(selected, { autoplay: v })}
          />
          <Toggle
            label="Controls"
            checked={edit.controls ?? true}
            onChange={(v) => patch(selected, { controls: v })}
          />
          <Toggle
            label="Muted"
            checked={edit.muted ?? true}
            onChange={(v) => patch(selected, { muted: v })}
          />
          <Toggle
            label="Loop"
            checked={!!edit.loop}
            onChange={(v) => patch(selected, { loop: v })}
          />
        </div>
      ) : null}

      {kind === "icon" ? (
        <FontAwesomeIconPicker
          selectedClass={
            edit.className ?? field?.attrs?.["className"] ?? field?.value ?? "fa-solid fa-star"
          }
          onChange={(newClass) => patch(selected, { className: newClass })}
        />
      ) : null}

      {kind === "svg" ? (
        <div className="space-y-3">
          <SectionTitle>SVG graphic</SectionTitle>
          <ColorInput
            label="Fill"
            value={edit.fill ?? "#0ea5a4"}
            onChange={(v) => patch(selected, { fill: v })}
          />
          <ColorInput
            label="Stroke"
            value={edit.stroke ?? "#0f172a"}
            onChange={(v) => patch(selected, { stroke: v })}
          />
        </div>
      ) : null}

      {kind === "button" || kind === "link" ? (
        <div className="space-y-3">
          <SectionTitle hint={field?.role}>{kind === "button" ? "Button" : "Link"}</SectionTitle>
          <TextInput
            label="Label"
            value={edit.text ?? field?.value ?? ""}
            onChange={(v) => patch(selected, { text: v })}
          />
          <TextInput
            label="Destination"
            value={edit.href ?? field?.attrs["href"] ?? ""}
            onChange={(v) => patch(selected, { href: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            {["_self", "_blank"].map((t) => (
              <button
                key={t}
                onClick={() => patch(selected, { target: t })}
                className={cn(
                  "rounded-lg border border-border px-2 py-2 text-[11px] font-semibold transition hover:border-primary/40",
                  (edit.target ?? field?.attrs["target"] ?? "_self") === t &&
                    "border-primary bg-primary/12 text-primary",
                )}
              >
                {t === "_self" ? "Same tab" : "New tab"}
              </button>
            ))}
          </div>
          <ColorInput
            label="Style variant color"
            value={edit.style?.["background-color"] ?? "#0ea5a4"}
            onChange={(v) => patch(selected, { style: { "background-color": v } })}
          />
        </div>
      ) : null}

      {kind === "table" ? (
        <div className="space-y-3">
          <SectionTitle>Table</SectionTitle>
          <p className="text-xs text-muted-foreground">
            {field?.value}. Click a cell in the preview and double-click to edit its content inline;
            headers behave the same way.
          </p>
        </div>
      ) : null}

      <StyleControls edit={edit} patch={patch} id={selected} />
    </div>
  );
}

function RepeaterPanel({
  page,
  state,
  commit,
  focus,
  editOf,
  patch,
  addItem,
}: {
  page: TemplateAnalysis["pages"][number];
  state: EditorState;
  commit: (s: EditorState) => void;
  focus: (id: string) => void;
  editOf: (id: string) => ElementEdit;
  patch: (id: string, p: ElementEdit) => void;
  addItem: (repeaterId: string, sourceIndex?: number) => void;
}) {
  const [open, setOpen] = useState<string | null>(page.repeaters[0]?.id ?? null);
  const [openItem, setOpenItem] = useState<string | null>(null);

  if (!page.repeaters.length) {
    return (
      <EmptyState
        icon={<Rows3 className="h-5 w-5" />}
        title="No repeaters on this page"
        body="Repeaters appear when three or more structurally identical siblings are detected."
      />
    );
  }

  const setItems = (repId: string, items: { key: string; srcIndex: number }[]) =>
    commit({ ...state, repeaters: { ...state.repeaters, [repId]: items } });

  return (
    <div className="fade-up space-y-3">
      <SectionTitle hint={page.name}>Repeaters</SectionTitle>
      {page.repeaters.map((r) => {
        const items = state.repeaters[r.id] ?? defaultRepeaterItems(r.itemIds);
        const expanded = open === r.id;
        return (
          <div key={r.id} className="rounded-lg border border-border bg-elevated/40">
            <button
              onClick={() => setOpen(expanded ? null : r.id)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              <Rows3 className="text-primary h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{r.label}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {items.length} items
                </span>
              </span>
              <ConfidenceChip level={r.confidence} />
            </button>
            {expanded ? (
              <div className="space-y-2 border-t border-border p-2.5">
                {items.map((item, i) => {
                  const srcId = r.itemIds[item.srcIndex] ?? r.itemIds[0]!;
                  const isOpen = openItem === item.key + r.id;
                  return (
                    <div key={item.key} className="rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-1 px-2 py-1.5">
                        <button
                          onClick={() => {
                            setOpenItem(isOpen ? null : item.key + r.id);
                            focus(`${item.key}::${srcId}`);
                          }}
                          className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold"
                        >
                          {r.itemLabels[item.srcIndex] ?? `${r.label} ${i + 1}`}
                        </button>
                        <Btn
                          size="icon"
                          variant="ghost"
                          title="Move up"
                          disabled={i === 0}
                          onClick={() => {
                            const next = [...items];
                            const tmp = next[i - 1]!;
                            next[i - 1] = next[i]!;
                            next[i] = tmp;
                            setItems(r.id, next);
                          }}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Btn>
                        <Btn
                          size="icon"
                          variant="ghost"
                          title="Move down"
                          disabled={i === items.length - 1}
                          onClick={() => {
                            const next = [...items];
                            const tmp = next[i + 1]!;
                            next[i + 1] = next[i]!;
                            next[i] = tmp;
                            setItems(r.id, next);
                          }}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Btn>
                        <Btn
                          size="icon"
                          variant="ghost"
                          title="Duplicate"
                          onClick={() => {
                            const next = [...items];
                            next.splice(i + 1, 0, {
                              key: `c${Date.now()}`,
                              srcIndex: item.srcIndex,
                            });
                            setItems(r.id, next);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Btn>
                        <Btn
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          disabled={items.length <= 1}
                          onClick={() =>
                            setItems(
                              r.id,
                              items.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <Trash2 className="text-destructive h-3 w-3" />
                        </Btn>
                      </div>
                      {isOpen ? (
                        <div className="space-y-2 border-t border-border p-2.5">
                          {page.fields
                            .filter((f) => f.inRepeater === r.id && f.id.startsWith("e"))
                            .filter((f) => {
                              const src = r.itemIds[item.srcIndex];
                              return src ? true : false;
                            })
                            .slice(0, 40)
                            .filter((f) => f.id !== srcId)
                            .map((f) => {
                              const targetId = `${item.key}::${f.id}`;
                              const e = editOf(targetId);
                              if (f.kind === "image") {
                                return (
                                  <TextInput
                                    key={f.id}
                                    label={`${f.label}`}
                                    value={e.src ?? f.value}
                                    onChange={(v) => patch(targetId, { src: v })}
                                  />
                                );
                              }
                              if (f.kind === "link" || f.kind === "button") {
                                return (
                                  <div key={f.id} className="space-y-1.5">
                                    <TextInput
                                      label={f.label}
                                      value={e.text ?? f.value}
                                      onChange={(v) => patch(targetId, { text: v })}
                                    />
                                    <TextInput
                                      label="Destination"
                                      value={e.href ?? f.attrs["href"] ?? ""}
                                      onChange={(v) => patch(targetId, { href: v })}
                                    />
                                  </div>
                                );
                              }
                              return (
                                <TextInput
                                  key={f.id}
                                  label={f.label}
                                  multiline={f.kind === "longtext" || f.kind === "quote"}
                                  value={e.text ?? f.value}
                                  onChange={(v) => patch(targetId, { text: v })}
                                />
                              );
                            })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <Btn size="sm" className="w-full justify-center" onClick={() => addItem(r.id)}>
                  <Plus className="h-3.5 w-3.5" /> Add item
                </Btn>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ThemePanel({
  state,
  setTheme,
  commit,
  analysis,
}: {
  state: EditorState;
  setTheme: (t: Partial<ThemeTokens>) => void;
  commit: (s: EditorState) => void;
  analysis: TemplateAnalysis;
}) {
  const [name, setName] = useState("");
  const colorKeys: (keyof ThemeTokens)[] = [
    "primary",
    "secondary",
    "accent",
    "background",
    "surface",
    "text",
    "muted",
    "border",
  ];
  return (
    <div className="fade-up space-y-4">
      <SectionTitle hint="Changes every page">Site style</SectionTitle>
      <div className="space-y-2">
        {colorKeys.map((k) => (
          <ColorInput
            key={k}
            label={k}
            value={state.theme[k]}
            onChange={(v) => setTheme({ [k]: v } as Partial<ThemeTokens>)}
          />
        ))}
      </div>
      <Slider
        label="Border radius"
        min={0}
        max={40}
        value={parseFloat(state.theme.radius) || 12}
        onChange={(v) => setTheme({ radius: `${v}px` })}
      />
      <TextInput
        label="Heading typeface"
        value={state.theme.fontHeading}
        onChange={(v) => setTheme({ fontHeading: v })}
      />
      <TextInput
        label="Text typeface"
        value={state.theme.fontBody}
        onChange={(v) => setTheme({ fontBody: v })}
      />
      <TextInput
        label="Content width"
        value={state.theme.container}
        onChange={(v) => setTheme({ container: v })}
      />
      <TextInput
        label="Shadow strength"
        value={state.theme.shadow}
        onChange={(v) => setTheme({ shadow: v })}
      />
      <div className="rounded-lg border border-border p-3">
        <SectionTitle>Saved styles</SectionTitle>
        <div className="space-y-1.5">
          {state.themes.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-2.5 py-2"
            >
              <div className="flex gap-1">
                {colorKeys.slice(0, 4).map((k) => (
                  <span
                    key={k}
                    className="h-4 w-4 rounded border border-border"
                    style={{ background: t.tokens[k] }}
                  />
                ))}
              </div>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{t.name}</span>
              <Btn size="sm" variant="ghost" onClick={() => commit({ ...state, theme: t.tokens })}>
                Apply
              </Btn>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this style"
            className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs outline-none"
          />
          <Btn
            size="sm"
            disabled={!name}
            onClick={() => {
              commit({ ...state, themes: [...state.themes, { name, tokens: state.theme }] });
              setName("");
            }}
          >
            Save style
          </Btn>
        </div>
      </div>
      <Btn
        size="sm"
        variant="ghost"
        className="w-full justify-center"
        onClick={() => setTheme(analysis.theme)}
      >
        <RotateCcw className="h-3.5 w-3.5" /> Use original website style
      </Btn>
    </div>
  );
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background/60">
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          className="h-32 w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-32 place-items-center text-[11px] font-semibold text-muted-foreground">
          Preview unavailable
        </div>
      )}
    </div>
  );
}

function AssetPanel({
  analysis,
  state,
  onReplace,
}: {
  analysis: TemplateAnalysis;
  state: EditorState;
  onReplace: (url: string, src: string) => void;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState(() =>
    analysis.assets.some((asset) => asset.kind === "image") ? "image" : "all",
  );
  const kinds = ["all", ...new Set(analysis.assets.map((a) => a.kind))];
  const list = analysis.assets.filter(
    (a) =>
      (kind === "all" || a.kind === kind) &&
      `${a.name} ${a.url}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="fade-up space-y-3">
      <SectionTitle hint={`${analysis.assets.length} total`}>Asset manager</SectionTitle>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search assets…"
          className="h-8 w-full bg-transparent text-xs outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-md border border-border px-2 py-1 text-[10px] font-semibold transition",
              kind === k ? "border-primary bg-primary/12 text-primary" : "text-muted-foreground",
            )}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        {list.map((a) => {
          const replacement = analysis.pages
            .flatMap((page) =>
              page.fields
                .filter((field) => field.value === a.url)
                .map((field) => state.edits[page.id]?.[field.id]?.src),
            )
            .find((src): src is string => Boolean(src));
          const src = replacement ?? a.url;
          const isImage = a.kind === "image";
          return (
            <div key={a.url} className="rounded-lg border border-border bg-elevated/40 p-2.5">
              <div className="flex items-center gap-2">
                {isImage ? (
                  <img
                    src={src}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded border border-border object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{a.name}</span>
                {a.missing ? <Chip tone="danger">missing</Chip> : null}
                {a.duplicateOf ? <Chip tone="warning">duplicate</Chip> : null}
                {!a.usedOn.length ? <Chip tone="muted">unused</Chip> : null}
              </div>
              <TextInput
                label="Asset URL"
                value={src}
                onChange={(value) => onReplace(a.url, value)}
              />
              <div className="mt-2 flex gap-1.5">
                <label className="cursor-pointer rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                  Replace local
                  <input
                    type="file"
                    accept={isImage ? "image/*" : undefined}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onReplace(a.url, URL.createObjectURL(file));
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                  {a.kind}
                </span>
                <span className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                  {a.usedOn.length} page{a.usedOn.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          );
        })}
        {!list.length ? (
          <EmptyState
            icon={<ImageIcon className="h-5 w-5" />}
            title="No assets match"
            body="Adjust the search or filter."
          />
        ) : null}
      </div>
    </div>
  );
}

function SeoPanel({
  seo,
  onChange,
}: {
  seo: Record<string, string | boolean>;
  onChange: (k: string, v: string) => void;
}) {
  const keys: [string, string][] = [
    ["title", "Page title"],
    ["description", "Meta description"],
    ["keywords", "Keywords"],
    ["canonical", "Canonical URL"],
    ["ogTitle", "OG title"],
    ["ogDescription", "OG description"],
    ["ogImage", "OG image"],
    ["twitterCard", "Twitter card"],
    ["robots", "Robots"],
    ["favicon", "Favicon"],
  ];
  return (
    <div className="fade-up space-y-3">
      <SectionTitle hint="Per page">SEO fields</SectionTitle>
      {keys.map(([k, label]) => (
        <TextInput
          key={k}
          label={label}
          value={String(seo[k] ?? "")}
          onChange={(v) => onChange(k, v)}
          multiline={k === "description" || k === "ogDescription"}
        />
      ))}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-3 py-2.5">
        {seo["schema"] ? (
          <Chip tone="success">Schema markup found</Chip>
        ) : (
          <Chip tone="warning">No schema markup</Chip>
        )}
      </div>
    </div>
  );
}

function NavPanel({
  page,
  editOf,
  patch,
  focus,
}: {
  page: TemplateAnalysis["pages"][number];
  editOf: (id: string) => ElementEdit;
  patch: (id: string, p: ElementEdit) => void;
  focus: (id: string) => void;
}) {
  if (!page.navGroups.length) {
    return (
      <EmptyState
        icon={<Link2 className="h-5 w-5" />}
        title="No navigation detected"
        body="Menus are detected from header, nav, footer and aside lists."
      />
    );
  }
  return (
    <div className="fade-up space-y-3">
      <SectionTitle hint={page.name}>Navigation</SectionTitle>
      {page.navGroups.map((g) => (
        <div key={g.id} className="rounded-lg border border-border bg-elevated/40 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold">{g.label}</p>
            <Chip tone="primary">{g.kind}</Chip>
          </div>
          <div className="space-y-2">
            {g.items.map((it) => {
              const e = editOf(it.id);
              return (
                <div key={it.id} className="rounded-lg border border-border bg-card p-2">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <button
                      onClick={() => focus(it.id)}
                      className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold"
                    >
                      {e.text ?? it.label}
                    </button>
                    <Btn
                      size="icon"
                      variant="ghost"
                      title="Toggle visibility"
                      onClick={() => patch(it.id, { hidden: !e.hidden })}
                    >
                      {e.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Btn>
                  </div>
                  <TextInput
                    label="Label"
                    value={e.text ?? it.label}
                    onChange={(v) => patch(it.id, { text: v })}
                  />
                  <div className="mt-1.5">
                    <TextInput
                      label="Destination"
                      value={e.href ?? it.href}
                      onChange={(v) => patch(it.id, { href: v })}
                    />
                  </div>
                  {it.children.length ? (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {it.children.length} nested items
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValidationPanel({
  analysis,
  focus,
}: {
  analysis: TemplateAnalysis;
  focus: (id: string) => void;
}) {
  const order = { error: 0, warning: 1, info: 2 } as const;
  const issues = [...analysis.issues].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <div className="fade-up space-y-3">
      <SectionTitle hint={`${issues.filter((i) => i.severity === "error").length} blocking`}>
        Pre-publish validation
      </SectionTitle>
      {issues.map((i) => (
        <button
          key={i.id}
          onClick={() => i.elementId && focus(i.elementId)}
          className="block w-full rounded-lg border border-border bg-elevated/40 p-2.5 text-left transition hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <Chip
              tone={
                i.severity === "error" ? "danger" : i.severity === "warning" ? "warning" : "primary"
              }
            >
              {i.severity}
            </Chip>
            <span className="truncate text-[10px] text-muted-foreground">{i.category}</span>
          </div>
          <p className="mt-1.5 text-[11px] font-semibold">{i.message}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{i.fix}</p>
        </button>
      ))}
      {!issues.length ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="All clear"
          body="No validation issues detected."
        />
      ) : null}
    </div>
  );
}

function HistoryPanel({
  revisions,
  cursor,
  length,
  onRestore,
}: {
  revisions: { label: string; at: string; state: EditorState }[];
  cursor: number;
  length: number;
  onRestore: (s: EditorState) => void;
}) {
  return (
    <div className="fade-up space-y-3">
      <SectionTitle hint={`${cursor + 1}/${length} steps`}>History</SectionTitle>
      <div className="rounded-lg border border-border bg-elevated/40 p-3 text-[11px] text-muted-foreground">
        Undo and redo are available in the toolbar. Autosave keeps the working draft, and each
        manual save creates a restorable revision.
      </div>
      {revisions.length ? (
        <div className="space-y-1.5">
          {revisions.map((r) => (
            <div
              key={r.at + r.label}
              className="flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-2.5 py-2"
            >
              <Layers className="text-primary h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold">{r.label}</p>
                <p className="text-[10px] text-muted-foreground">{r.at}</p>
              </div>
              <Btn size="sm" variant="ghost" onClick={() => onRestore(r.state)}>
                Restore
              </Btn>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title="No revisions yet"
          body="Hit Save in the toolbar to snapshot the current draft."
        />
      )}
    </div>
  );
}
