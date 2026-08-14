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
  FileCode2,
  History,
  Image as ImageIcon,
  Laptop,
  Layers,
  Link2,
  ListTree,
  Monitor,
  Palette,
  Pencil,
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
  Upload,
  Video as VideoIcon,
  X,
  Loader2,
} from "lucide-react";
import { getWebsiteAssets, type MediaAsset } from "@/lib/auth-api";
import { toast } from "sonner";
import { renderPage, defaultRepeaterItems } from "@/lib/template-engine/render";
import type { EditableField, EditorState, ElementEdit, TemplateAnalysis, ThemeTokens } from "@/lib/template-engine/types";
import { Btn, Chip, ColorInput, ConfidenceChip, EmptyState, Panel, SectionTitle, Slider, TextInput, Toggle } from "./ui";
import { cn } from "@/lib/utils";

const DEVICES = [
  { id: "desktop", label: "Desktop", w: 1440, icon: Monitor },
  { id: "laptop", label: "Laptop", w: 1280, icon: Laptop },
  { id: "tablet", label: "Tablet", w: 834, icon: Tablet },
  { id: "mobile-l", label: "Large mobile", w: 430, icon: Smartphone },
  { id: "mobile-s", label: "Small mobile", w: 360, icon: Smartphone },
] as const;

type RightTab = "element" | "repeaters" | "theme" | "assets" | "seo" | "nav" | "validation" | "history";

const baseId = (id: string) => (id.includes("::") ? (id.split("::")[1] ?? id) : id);
const itemKeyOf = (id: string) => (id.includes("::") ? (id.split("::")[0] ?? "") : "");

export function Editor({
  analysis,
  websiteId,
  initialState,
  entitlements,
  isAdmin = false,
  onExit,
  onSaveDraft,
  onPublish,
  onUploadImage,
}: {
  analysis: TemplateAnalysis;
  websiteId?: string;
  initialState?: Partial<EditorState> | undefined;
  entitlements?: Record<string, boolean | string> | undefined;
  isAdmin?: boolean;
  onExit: () => void;
  onSaveDraft?: (state: EditorState) => void;
  onPublish?: (state: EditorState) => void;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const initial: EditorState = useMemo(
    () => ({
      edits: initialState?.edits ?? {},
      repeaters: initialState?.repeaters ?? Object.fromEntries(
        analysis.pages.flatMap((p) => p.repeaters.map((r) => [r.id, defaultRepeaterItems(r.itemIds)])),
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
  const [interactMode, setInteractMode] = useState(false);
  const [device, setDevice] = useState<string>("desktop");
  const [customWidth, setCustomWidth] = useState(1440);
  const [landscape, setLandscape] = useState(false);
  const [zoom, setZoom] = useState(0.62);
  const [tab, setTab] = useState<RightTab>("element");
  const [treeQuery, setTreeQuery] = useState("");
  const [revisions, setRevisions] = useState<{ label: string; at: string; state: EditorState }[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const previewScrollRef = useRef<{ x: number; y: number } | null>(null);

  const toggleInteractMode = () => {
    const next = !interactMode;
    setInteractMode(next);
    frameRef.current?.contentWindow?.postMessage({ source: "te-host", type: "set-interact-mode", interact: next }, "*");
    flash(next ? "Interactive Mode: Click buttons/modals to test" : "Edit Mode: Click any element to edit");
  };

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
      const matchingFields = assetPage.fields.filter((field) => field.value === url && ["image", "video"].includes(field.kind));
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
  const setTheme = (t: Partial<ThemeTokens>) => commit({ ...state, theme: { ...state.theme, ...t } });

  const addRepeaterItem = useCallback(
    (repeaterId: string, requestedSourceIndex = 0) => {
      const repeater = page.repeaters.find((candidate) => candidate.id === repeaterId);
      if (!repeater) return;
      const items = state.repeaters[repeater.id] ?? defaultRepeaterItems(repeater.itemIds);
      const sourceIndex = Number.isInteger(requestedSourceIndex) && requestedSourceIndex >= 0 && requestedSourceIndex < repeater.itemIds.length
        ? requestedSourceIndex
        : 0;
      const key = `c${Date.now()}-${items.length}`;

      preservePreviewScroll();
      commit({ ...state, repeaters: { ...state.repeaters, [repeater.id]: [...items, { key, srcIndex: sourceIndex }] } });
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
      if (d.type === "open-tab" && typeof d.tab === "string") {
        if (d.id) setSelected(d.id);
        setTab(d.tab as RightTab);
      }
      if (d.type === "delete-element" && typeof d.id === "string") {
        patch(d.id, { hidden: true });
        flash("Element hidden from page");
      }
      if (d.type === "style-patch" && typeof d.id === "string" && d.style) {
        patch(d.id, { style: d.style });
      }
      if (d.type === "text") patch(d.id, { text: String(d.value ?? "") });
      if (d.type === "navigate" && typeof d.href === "string") {
        const cleanHref = d.href.replace(/^\//, "").split("#")[0]?.split("?")[0] || "";
        const targetPage = analysis.pages.find((p) => p.name === cleanHref || p.name === `${cleanHref}.html` || (cleanHref === "" && p.name === "index.html"));
        if (targetPage) {
          setPageId(targetPage.id);
          flash(`Switched to ${targetPage.name}`);
        } else {
          flash(`Link points to ${d.href} (Navigation restricted in editor)`);
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [addRepeaterItem, patch]);

  useEffect(() => {
    const t = setTimeout(() => setSavedAt(new Date().toLocaleTimeString()), 900);
    return () => clearTimeout(t);
  }, [history, cursor]);

  const srcDoc = useMemo(() => renderPage(analysis, page, state, { interactive: true }), [analysis, page, state]);

  const focusInPreview = (id: string) => {
    setSelected(id);
    frameRef.current?.contentWindow?.postMessage({ source: "te-host", type: "focus", id }, "*");
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute("contenteditable") === "true";

      // Save Draft (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setRevisions((r) => [{ label: `Revision ${r.length + 1}`, at: new Date().toLocaleString(), state }, ...r]);
        if (onSaveDraft) onSaveDraft(state);
        flash("Version saved");
        return;
      }

      // Undo (Ctrl+Z / Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        if (!isInput && cursor > 0) {
          e.preventDefault();
          setCursor((c) => c - 1);
          flash("Undo");
        }
        return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        if (!isInput && cursor < history.length - 1) {
          e.preventDefault();
          setCursor((c) => c + 1);
          flash("Redo");
        }
        return;
      }

      // Escape to deselect
      if (e.key === "Escape") {
        if (selected) {
          setSelected(null);
          frameRef.current?.contentWindow?.postMessage({ source: "te-host", type: "focus", id: "" }, "*");
        }
        return;
      }

      // Delete/Backspace to hide selected element
      if ((e.key === "Delete" || e.key === "Backspace") && !isInput && selected) {
        e.preventDefault();
        patch(selected, { hidden: true });
        flash("Element hidden from page");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cursor, history.length, onSaveDraft, patch, selected, state]);

  // Compute breadcrumbs for currently selected element
  const breadcrumbs = useMemo(() => {
    if (!selected || !page) return [];
    const crumbs: { id: string; label: string; tag: string }[] = [];
    const bId = baseId(selected);

    // Find in tree recursively
    const findPath = (
      nodes: { id: string; label: string; kind: string; children: unknown[] }[],
      targetId: string,
      path: { id: string; label: string; tag: string }[] = [],
    ): { id: string; label: string; tag: string }[] | null => {
      if (!Array.isArray(nodes)) return null;
      for (const n of nodes) {
        if (!n) continue;
        const currentPath = [...path, { id: n.id, label: n.label, tag: n.kind }];
        if (n.id === targetId || n.id === bId) {
          return currentPath;
        }
        if (Array.isArray(n.children) && n.children.length) {
          const res = findPath(
            n.children as { id: string; label: string; kind: string; children: unknown[] }[],
            targetId,
            currentPath,
          );
          if (res) return res;
        }
      }
      return null;
    };

    if (page.tree) {
      const treePath = findPath(page.tree, selected);
      if (treePath?.length) {
        return treePath;
      }
    }

    // Fallback: match field & repeater
    const f = page.fields?.find((f) => f.id === bId);
    if (f?.inRepeater && page.repeaters) {
      const rep = page.repeaters.find((r) => r.id === f.inRepeater);
      if (rep) crumbs.push({ id: rep.containerId, label: rep.label, tag: "repeater" });
    }
    if (f) crumbs.push({ id: selected, label: f.label || f.tag, tag: f.tag });
    return crumbs;
  }, [page, selected]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const field: EditableField | undefined = selected
    ? page.fields.find((f) => f.id === baseId(selected))
    : undefined;

  const deviceWidth = device === "custom" ? customWidth : (DEVICES.find((d) => d.id === device)?.w ?? 1440);
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
      <header className="z-20 flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-4">
          <button onClick={onExit} className="flex min-w-0 items-center gap-2.5 group" title="Exit to templates">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold transition group-hover:scale-105 group-hover:bg-primary/25 border border-primary/30 shadow-xs">
              WM
            </span>
            <span className="min-w-0 text-left">
              <span className="flex items-center gap-1.5 font-display text-xs font-bold tracking-tight text-foreground">
                {analysis.name}
                {published && <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-medium text-emerald-400 border border-emerald-500/30">Live</span>}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {savedAt ? `Saved at ${savedAt}` : "Autosaved"}
              </span>
            </span>
          </button>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Page Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {analysis.pages.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPageId(p.id);
                  setSelected(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                  p.id === pageId
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-elevated hover:text-foreground",
                )}
              >
                <FileCode2 className="h-3 w-3" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-elevated/40 p-0.5">
            <Btn size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Undo (Ctrl+Z)" disabled={cursor === 0} onClick={() => setCursor((c) => c - 1)}>
              <Undo2 className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Redo (Ctrl+Y)"
              disabled={cursor >= history.length - 1}
              onClick={() => setCursor((c) => c + 1)}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Btn>
          </div>

          <Btn size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground gap-1.5" title="Export page HTML" onClick={download}>
            <Download className="h-3.5 w-3.5" /> Export
          </Btn>

          <Btn
            size="sm"
            variant="outline"
            className="text-xs border-border/80 text-foreground gap-1.5 shadow-xs"
            onClick={() => {
              setRevisions((r) => [{ label: `Revision ${r.length + 1}`, at: new Date().toLocaleString(), state }, ...r]);
              if (onSaveDraft) onSaveDraft(state);
              flash("Draft saved");
            }}
          >
            <Save className="h-3.5 w-3.5" /> Save Draft
          </Btn>

          <Btn
            size="sm"
            variant="primary"
            className="text-xs font-semibold gap-1.5 shadow-sm"
            onClick={() => {
              const errs = analysis.issues.filter((i) => i.severity === "error").length;
              if (errs) {
                setTab("validation");
                flash(`Fix ${errs} important issue${errs === 1 ? "" : "s"} before making changes live`);
                return;
              }
              setPublished(true);
              if (onPublish) onPublish(state);
              flash("Your changes are live");
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Publish Live
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
                  .filter((f) => `${f.label} ${f.value}`.toLowerCase().includes(treeQuery.toLowerCase()))
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
                    device === d.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <d.icon className={cn("h-3.5 w-3.5", d.id === "mobile-s" && "scale-75")} />
                </button>
              ))}
              <button
                onClick={() => setDevice("custom")}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-semibold transition",
                  device === "custom" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
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
            <Btn size="sm" variant={landscape ? "primary" : "default"} onClick={() => setLandscape(!landscape)}>
              <RotateCcw className="h-3.5 w-3.5" /> {landscape ? "Landscape" : "Portrait"}
            </Btn>

            <div className="flex items-center gap-1 bg-background/80 rounded-lg p-0.5 border border-border">
              <button
                type="button"
                onClick={() => interactMode && toggleInteractMode()}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition",
                  !interactMode ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Click any element to select and edit its content or style"
              >
                <Pencil className="h-3 w-3" /> Edit Mode
              </button>
              <button
                type="button"
                onClick={() => !interactMode && toggleInteractMode()}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition",
                  interactMode ? "bg-cyan-500 text-slate-950 font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Test modals, buttons, and popups by clicking them directly"
              >
                <Eye className="h-3 w-3" /> Interact &amp; Open Modals
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Chip>{frameWidth}px</Chip>
              <div className="w-28">
                <Slider label="Zoom" min={30} max={110} value={Math.round(zoom * 100)} unit="%" onChange={(v) => setZoom(v / 100)} />
              </div>
            </div>
          </div>
          <div className="surface-grid min-h-0 flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center justify-between">
            <div className="my-auto flex justify-center w-full" style={{ minHeight: "calc(100vh - 220px)" }}>
              <div
                style={{
                  width: frameWidth * zoom,
                  height: 960 * zoom,
                  position: "relative",
                }}
              >
                <div
                  className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xl transition-transform"
                  style={{
                    width: frameWidth,
                    height: 960,
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
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary border border-primary/20">
                  <Sparkles className="h-3 w-3" /> Quick Tip: Double-click any text to type directly on canvas
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">Click any card or button to customize its style &amp; links</span>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground/80 hidden md:block">
                <span className="text-primary/90 font-semibold">Ctrl+S</span> Save · <span className="text-primary/90 font-semibold">Ctrl+Z</span> Undo · <span className="text-primary/90 font-semibold">Del</span> Delete
              </p>
            </div>
          </div>

          {/* Canvas Bottom Breadcrumb Bar */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 border-t border-border bg-card/80 px-4 py-2 text-xs backdrop-blur">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Hierarchy:</span>
              <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <div key={crumb.id + idx} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => focusInPreview(crumb.id)}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium transition",
                          isLast
                            ? "bg-primary/20 text-primary font-semibold border border-primary/30 shadow-xs"
                            : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                        )}
                      >
                        {crumb.label.replace(/^div\s*>\s*/i, "").trim() || crumb.tag || "Element"}
                      </button>
                      {!isLast && <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                  tab === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-elevated",
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
                page={page}
                websiteId={websiteId}
                isAdmin={isAdmin}
                onAddRepeaterItem={addRepeaterItem}
                onSwitchTab={setTab}
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
            {tab === "theme" ? <ThemePanel state={state} setTheme={setTheme} commit={commit} analysis={analysis} /> : null}
            {tab === "assets" ? <AssetPanel analysis={analysis} state={state} onReplace={replaceAsset} /> : null}
            {tab === "seo" ? (
              <SeoPanel
                seo={{ ...page.seo, ...(state.seo[page.id] ?? {}) }}
                onChange={(k, v) =>
                  commit({ ...state, seo: { ...state.seo, [page.id]: { ...(state.seo[page.id] ?? {}), [k]: v } } })
                }
              />
            ) : null}
            {tab === "nav" ? <NavPanel page={page} editOf={editOf} patch={patch} focus={focusInPreview} /> : null}
            {tab === "validation" ? <ValidationPanel analysis={analysis} focus={focusInPreview} /> : null}
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

function getNodeIcon(kind: string, label: string) {
  const l = label.toLowerCase();
  if (kind === "repeater") return Rows3;
  if (kind === "item") return Boxes;
  if (l.includes("img") || l.includes("image") || l.includes("photo") || l.includes("banner")) return ImageIcon;
  if (l.includes("btn") || l.includes("button") || l.includes("link")) return Link2;
  if (l.includes("heading") || l.includes("title") || l.includes("text") || l.includes("p") || l.includes("quote")) return Type;
  if (l.includes("nav") || l.includes("menu")) return ListTree;
  return ChevronRight;
}

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
    <ul className={cn(depth > 0 && "ml-2 border-l border-border/60 pl-1.5")}>
      {nodes.map((n) => {
        const Icon = getNodeIcon(n.kind, n.label);
        const isSelected = selected === n.id || (selected && selected.endsWith(`::${n.id}`));
        return (
          <li key={n.id + n.label}>
            <button
              onClick={() => onSelect(n.id)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] transition",
                isSelected
                  ? "bg-primary/15 text-primary font-medium ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-elevated hover:text-foreground",
              )}
            >
              <Icon className={cn("h-3 w-3 shrink-0", isSelected ? "text-primary" : "text-muted-foreground/70")} />
              <span className="truncate">{n.label.replace(/^div\s*>\s*/i, "").trim() || "Container"}</span>
            </button>
            {n.children.length ? (
              <TreeView
                nodes={n.children as { id: string; label: string; kind: string; children: unknown[] }[]}
                onSelect={onSelect}
                selected={selected}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

const FA_ICONS = [
  // Common & UI
  "fa-solid fa-check", "fa-solid fa-check-circle", "fa-solid fa-xmark", "fa-solid fa-circle-xmark",
  "fa-solid fa-arrow-right", "fa-solid fa-arrow-left", "fa-solid fa-arrow-up", "fa-solid fa-arrow-down",
  "fa-solid fa-chevron-right", "fa-solid fa-chevron-left", "fa-solid fa-chevron-up", "fa-solid fa-chevron-down",
  "fa-solid fa-bars", "fa-solid fa-ellipsis", "fa-solid fa-magnifying-glass", "fa-solid fa-plus", "fa-solid fa-minus",
  "fa-solid fa-gear", "fa-solid fa-sliders", "fa-solid fa-filter", "fa-solid fa-bell", "fa-solid fa-circle-info",
  "fa-solid fa-triangle-exclamation", "fa-solid fa-circle-question", "fa-solid fa-shield-halved", "fa-solid fa-lock",
  "fa-solid fa-unlock", "fa-solid fa-key", "fa-solid fa-eye", "fa-solid fa-eye-slash", "fa-solid fa-trash",
  "fa-solid fa-pen", "fa-solid fa-pen-to-square", "fa-solid fa-floppy-disk", "fa-solid fa-share-nodes",

  // Business & Finance
  "fa-solid fa-briefcase", "fa-solid fa-building", "fa-solid fa-chart-line", "fa-solid fa-chart-pie",
  "fa-solid fa-chart-column", "fa-solid fa-dollar-sign", "fa-solid fa-euro-sign", "fa-solid fa-sterling-sign",
  "fa-solid fa-indian-rupee-sign", "fa-solid fa-credit-card", "fa-solid fa-wallet", "fa-solid fa-coins",
  "fa-solid fa-receipt", "fa-solid fa-calculator", "fa-solid fa-handshake", "fa-solid fa-award",
  "fa-solid fa-trophy", "fa-solid fa-medal", "fa-solid fa-crown", "fa-solid fa-gem", "fa-solid fa-scale-balanced",

  // Communication & Contact
  "fa-solid fa-phone", "fa-solid fa-envelope", "fa-solid fa-envelope-open", "fa-solid fa-message",
  "fa-solid fa-comments", "fa-solid fa-paper-plane", "fa-solid fa-location-dot", "fa-solid fa-map-pin",
  "fa-solid fa-map", "fa-solid fa-globe", "fa-solid fa-headset", "fa-solid fa-address-book",

  // Media & Photography
  "fa-solid fa-camera", "fa-solid fa-camera-retro", "fa-solid fa-image", "fa-solid fa-images",
  "fa-solid fa-video", "fa-solid fa-film", "fa-solid fa-play", "fa-solid fa-pause", "fa-solid fa-volume-high",
  "fa-solid fa-music", "fa-solid fa-microphone", "fa-solid fa-clapperboard", "fa-solid fa-palette",

  // Tech & Devices
  "fa-solid fa-laptop", "fa-solid fa-desktop", "fa-solid fa-mobile-screen", "fa-solid fa-tablet-screen-button",
  "fa-solid fa-server", "fa-solid fa-database", "fa-solid fa-code", "fa-solid fa-terminal",
  "fa-solid fa-wifi", "fa-solid fa-signal", "fa-solid fa-cloud", "fa-solid fa-cloud-arrow-up",
  "fa-solid fa-cloud-arrow-down", "fa-solid fa-bolt", "fa-solid fa-plug", "fa-solid fa-battery-full",
  "fa-solid fa-microchip", "fa-solid fa-robot", "fa-solid fa-network-wired",

  // People & User
  "fa-solid fa-user", "fa-solid fa-users", "fa-solid fa-user-group", "fa-solid fa-user-plus",
  "fa-solid fa-user-tie", "fa-solid fa-user-shield", "fa-solid fa-circle-user", "fa-solid fa-heart",
  "fa-solid fa-thumbs-up", "fa-solid fa-thumbs-down", "fa-solid fa-star", "fa-solid fa-face-smile",

  // Shopping & Ecommerce
  "fa-solid fa-cart-shopping", "fa-solid fa-bag-shopping", "fa-solid fa-basket-shopping", "fa-solid fa-tag",
  "fa-solid fa-tags", "fa-solid fa-box", "fa-solid fa-boxes-stacked", "fa-solid fa-truck", "fa-solid fa-truck-fast",
  "fa-solid fa-store", "fa-solid fa-barcode", "fa-solid fa-gift",

  // Travel, Food & Lifestyle
  "fa-solid fa-calendar", "fa-solid fa-calendar-days", "fa-solid fa-clock", "fa-solid fa-hourglass",
  "fa-solid fa-car", "fa-solid fa-plane", "fa-solid fa-rocket", "fa-solid fa-bicycle", "fa-solid fa-hotel",
  "fa-solid fa-utensils", "fa-solid fa-mug-hot", "fa-solid fa-wine-glass", "fa-solid fa-burger",
  "fa-solid fa-dumbbell", "fa-solid fa-tree", "fa-solid fa-fire", "fa-solid fa-droplet", "fa-solid fa-sun",
  "fa-solid fa-moon", "fa-solid fa-leaf", "fa-solid fa-compass", "fa-solid fa-lightbulb",

  // Social & Brands
  "fa-brands fa-facebook", "fa-brands fa-instagram", "fa-brands fa-x-twitter", "fa-brands fa-twitter",
  "fa-brands fa-linkedin", "fa-brands fa-youtube", "fa-brands fa-tiktok", "fa-brands fa-pinterest",
  "fa-brands fa-whatsapp", "fa-brands fa-telegram", "fa-brands fa-github", "fa-brands fa-google",
  "fa-brands fa-apple", "fa-brands fa-windows", "fa-brands fa-android", "fa-brands fa-spotify",
  "fa-brands fa-discord", "fa-brands fa-slack", "fa-brands fa-dribbble", "fa-brands fa-behance"
];

function FontAwesomeIconPicker({
  currentClass,
  onSelect,
}: {
  currentClass: string;
  onSelect: (className: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = FA_ICONS.filter((cls) => {
    const cleanName = cls.replace(/^fa-(solid|brands|regular)\s+fa-/, "");
    const matchesSearch = cleanName.toLowerCase().includes(search.toLowerCase().trim());
    if (!matchesSearch) return false;
    if (category === "brands") return cls.startsWith("fa-brands");
    if (category === "solid") return cls.startsWith("fa-solid");
    return true;
  });

  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-3 space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search 400+ FontAwesome icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
        {[
          ["all", "All Icons"],
          ["solid", "Solid / UI"],
          ["brands", "Brands & Social"],
        ].map(([cat, label]) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "whitespace-nowrap rounded-md px-2 py-1 font-medium transition",
              category === cat ? "bg-primary text-primary-foreground font-semibold" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Icons Grid */}
      <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 border border-border/60 rounded-lg bg-background/50">
        {filtered.map((cls) => {
          const isSelected = currentClass === cls || currentClass.includes(cls.split(" ")[1] || "___");
          return (
            <button
              key={cls}
              type="button"
              onClick={() => onSelect(cls)}
              title={cls}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition hover:scale-110 hover:border-primary hover:bg-primary/10",
                isSelected ? "border-cyan-500 bg-cyan-500/20 text-cyan-400 font-bold" : "border-border/80 text-foreground bg-card"
              )}
            >
              <i className={cls} />
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Showing {filtered.length} icons · Click any icon to apply
      </p>
    </div>
  );
}

function MediaLibraryModal({
  websiteId,
  currentSrc,
  onSelect,
  onUpload,
  onClose,
}: {
  websiteId?: string;
  currentSrc?: string;
  onSelect: (url: string) => void;
  onUpload?: (file: File) => Promise<string>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!websiteId) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    getWebsiteAssets(websiteId)
      .then((res) => {
        if (isMounted) setAssets(res.assets || []);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [websiteId]);

  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return assets;
    return assets.filter((a) => (a.originalName || a.filename || "").toLowerCase().includes(q));
  }, [assets, search]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    try {
      setUploading(true);
      const url = await onUpload(file);
      onSelect(url);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">Media Library</h3>
              <p className="text-[11px] text-muted-foreground">Select an existing image or upload a new one</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-elevated hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-border bg-elevated/20 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search uploaded images by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 shadow-xs">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span>Upload Image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUploadFile} disabled={uploading} />
          </label>
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[260px]">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading media assets...</p>
            </div>
          ) : filteredAssets.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = currentSrc === asset.url;
                return (
                  <button
                    key={asset._id || asset.url}
                    type="button"
                    onClick={() => onSelect(asset.url)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-xl border bg-background text-left transition hover:scale-[1.02] hover:shadow-md",
                      isSelected ? "border-primary ring-2 ring-primary/50 shadow-glow" : "border-border/80 hover:border-primary/50"
                    )}
                  >
                    <img src={asset.url} alt={asset.alt || asset.originalName} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-[10px] text-white">
                      <p className="truncate font-medium">{asset.originalName || asset.filename}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 opacity-40 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">No media assets found</p>
              <p className="text-[11px] max-w-xs text-muted-foreground">
                Upload your first image to store it in your library and reuse it anywhere across your site.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-elevated/20 px-4 py-2.5 text-xs text-muted-foreground">
          <span>{filteredAssets.length} image{filteredAssets.length === 1 ? "" : "s"} available</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-elevated transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function StyleControls({
  edit,
  patch,
  id,
  kind,
}: {
  edit: ElementEdit;
  patch: (id: string, p: ElementEdit) => void;
  id: string;
  kind?: string;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const s = edit.style ?? {};
  const num = (key: string, fallback: number) => parseFloat(String(s[key] ?? fallback));
  const set = (key: string, value: string) => patch(id, { style: { [key]: value } });

  const isText = ["title", "subtitle", "description", "longtext", "richtext", "quote", "caption", "badge"].includes(kind ?? "");
  const isImage = kind === "image";
  const isButton = kind === "button" || kind === "link";

  return (
    <div className="space-y-3 pt-2">
      <SectionTitle>Styling</SectionTitle>

      {/* Alignment for Text & Buttons */}
      {(isText || isButton || !kind) && (
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
              {(() => {
                const I = Icon as typeof AlignLeft;
                return <I className="h-3.5 w-3.5" />;
              })()}
            </button>
          ))}
        </div>
      )}

      {/* Essential Controls based on element type */}
      {isText && (
        <>
          <Slider label="Font size" min={10} max={72} value={num("font-size", 16)} onChange={(v) => set("font-size", `${v}px`)} />
          <ColorInput label="Text color" value={String(s["color"] ?? "#0f172a")} onChange={(v) => set("color", v)} />
        </>
      )}

      {isImage && (
        <>
          <Slider label="Corner roundness" min={0} max={48} value={num("border-radius", 8)} onChange={(v) => set("border-radius", `${v}px`)} />
          <Slider label="Opacity" min={10} max={100} value={num("opacity", 1) <= 1 ? num("opacity", 1) * 100 : num("opacity", 100)} unit="%" onChange={(v) => set("opacity", String(v / 100))} />
        </>
      )}

      {isButton && (
        <>
          <Slider label="Corner roundness" min={0} max={48} value={num("border-radius", 8)} onChange={(v) => set("border-radius", `${v}px`)} />
          <ColorInput label="Text color" value={String(s["color"] ?? "#ffffff")} onChange={(v) => set("color", v)} />
        </>
      )}

      {/* Advanced Layout Accordion */}
      <div className="rounded-lg border border-border/80 bg-elevated/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <span>More Style Options</span>
          <span className="text-[10px] font-mono">{showAdvanced ? "▲ Hide" : "▼ Show"}</span>
        </button>

        {showAdvanced && (
          <div className="space-y-3 p-3 border-t border-border/60">
            <Slider label="Padding" min={0} max={80} value={num("padding", 0)} onChange={(v) => set("padding", `${v}px`)} />
            <Slider label="Margin top" min={-40} max={80} value={num("margin-top", 0)} onChange={(v) => set("margin-top", `${v}px`)} />
            <Slider label="Letter spacing" min={-3} max={8} step={0.5} value={num("letter-spacing", 0)} onChange={(v) => set("letter-spacing", `${v}px`)} />
            <Slider label="Width" min={10} max={100} unit="%" value={num("width", 100)} onChange={(v) => set("width", `${v}%`)} />
            <ColorInput label="Background color" value={String(s["background-color"] ?? "")} onChange={(v) => set("background-color", v)} />
            <TextInput label="Gradient overlay" value={String(s["background-image"] ?? "")} placeholder="linear-gradient(90deg,#0ea5a4,#f59e0b)" onChange={(v) => set("background-image", v)} />
            <TextInput label="Box shadow" value={String(s["box-shadow"] ?? "")} placeholder="0 20px 40px -20px rgba(0,0,0,.4)" onChange={(v) => set("box-shadow", v)} />
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border/80 space-y-2">
        <Toggle label="Hidden on page" checked={!!edit.hidden} onChange={(v) => patch(id, { hidden: v })} />
        <button
          type="button"
          onClick={() => patch(id, { hidden: !edit.hidden })}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition border",
            edit.hidden
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {edit.hidden ? "Restore Element to Page" : "Delete / Hide Element from Page"}
        </button>
      </div>
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
  page,
  websiteId,
  isAdmin = false,
  onAddRepeaterItem,
  onSwitchTab,
}: {
  selected: string | null;
  field?: EditableField | undefined;
  edit: ElementEdit;
  patch: (id: string, p: ElementEdit) => void;
  onUploadImage: ((file: File) => Promise<string>) | undefined;
  canEditAltText: boolean;
  page?: TemplateAnalysis["pages"][number];
  websiteId?: string;
  isAdmin?: boolean;
  onAddRepeaterItem?: (repeaterId: string) => void;
  onSwitchTab?: (tab: RightTab) => void;
}) {
  const [isMediaOpen, setIsMediaOpen] = useState(false);

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
  const matchedRepeater = field?.inRepeater
    ? page?.repeaters.find((r) => r.id === field.inRepeater)
    : page?.repeaters.find((r) => r.containerId === selected || r.itemIds.includes(selected) || (selected && r.itemIds.some((id) => selected.endsWith(id))));

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

      {matchedRepeater && onAddRepeaterItem ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Rows3 className="h-3.5 w-3.5" />
              <span>{matchedRepeater.label}</span>
            </div>
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab("repeaters")}
                className="text-[10px] text-muted-foreground hover:text-foreground underline"
              >
                Manage list
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-2.5">
            This element is part of a repeatable list (cards, grid, or reviews).
          </p>
          <Btn
            size="sm"
            variant="primary"
            className="w-full justify-center gap-1.5"
            onClick={() => onAddRepeaterItem(matchedRepeater.id)}
          >
            <Plus className="h-3.5 w-3.5" /> Add New {matchedRepeater.label.replace(/s$/i, "") || "Item"}
          </Btn>
        </div>
      ) : (
        /* Manual Repeater Conversion strictly for Admins */
        (isAdmin && selected) && (
          <div className="rounded-xl border border-border/80 bg-elevated/40 p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Rows3 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Repeatable Section</span>
              </div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Admin</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2.5">
              Want this element or card to be a repeatable list (duplicate, reorder, add cards)?
            </p>
            <Btn
              size="sm"
              variant="outline"
              className="w-full justify-center gap-1.5 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => {
                const bId = baseId(selected);
                // Create a dynamic repeater for this container
                const newRepId = `rep-custom-${Date.now()}`;
                const newRepeater: Repeater = {
                  id: newRepId,
                  containerId: bId,
                  label: field?.label || "Custom Repeater List",
                  type: "Cards",
                  itemIds: [bId],
                  itemLabels: [field?.label || "Card 1"],
                  fieldsPerItem: 1,
                  confidence: "High",
                };
                if (page) {
                  page.repeaters = [...page.repeaters, newRepeater];
                  if (field) field.inRepeater = newRepId;
                }
                if (onAddRepeaterItem) onAddRepeaterItem(newRepId);
                toast.success("Repeater enabled for this element!");
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Enable Repeater on this Element
            </Btn>
          </div>
        )
      )}

      {["title", "subtitle", "description", "longtext", "richtext", "quote", "caption", "badge", "number", "currency", "date"].includes(
        kind,
      ) ? (
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
          <ImagePreview src={edit.src ?? field?.value ?? ""} alt={edit.alt ?? field?.attrs["alt"] ?? field?.label ?? "Image preview"} />
          <TextInput label="Source URL" value={edit.src ?? field?.value ?? ""} onChange={(v) => patch(selected, { src: v })} />
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsMediaOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 shadow-xs"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Media Library
            </button>
            <label className="flex items-center justify-center gap-1.5 cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/50 shadow-xs">
              <Upload className="h-3.5 w-3.5 text-muted-foreground" /> Direct Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
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
          </div>

          {isMediaOpen && (
            <MediaLibraryModal
              websiteId={websiteId}
              currentSrc={edit.src ?? field?.value ?? ""}
              onSelect={(url) => {
                patch(selected, { src: url });
                setIsMediaOpen(false);
                toast.success("Image selected from library");
              }}
              onUpload={onUploadImage}
              onClose={() => setIsMediaOpen(false)}
            />
          )}

          {canEditAltText ? <TextInput label="Alt text" value={edit.alt ?? field?.attrs["alt"] ?? ""} onChange={(v) => patch(selected, { alt: v })} /> : null}
          <TextInput label="Title attribute" value={edit.title ?? ""} onChange={(v) => patch(selected, { title: v })} />
          <TextInput label="Focal point (object-position)" value={edit.style?.["object-position"] ?? ""} placeholder="50% 30%" onChange={(v) => patch(selected, { style: { "object-position": v, "object-fit": "cover" } })} />
          <Toggle label="Lazy loading" checked={(edit.loading ?? field?.attrs["loading"]) === "lazy"} onChange={(v) => patch(selected, { loading: v ? "lazy" : "eager" })} />
        </div>
      ) : null}

      {kind === "video" ? (
        <div className="space-y-3">
          <SectionTitle hint={field?.role}>Video</SectionTitle>
          <TextInput label="Source" value={edit.src ?? field?.value ?? ""} onChange={(v) => patch(selected, { src: v })} />
          <TextInput label="Thumbnail / poster" value={edit.poster ?? field?.attrs["poster"] ?? ""} onChange={(v) => patch(selected, { poster: v })} />
          <Toggle label="Autoplay" checked={!!edit.autoplay} onChange={(v) => patch(selected, { autoplay: v })} />
          <Toggle label="Controls" checked={edit.controls ?? true} onChange={(v) => patch(selected, { controls: v })} />
          <Toggle label="Muted" checked={edit.muted ?? true} onChange={(v) => patch(selected, { muted: v })} />
          <Toggle label="Loop" checked={!!edit.loop} onChange={(v) => patch(selected, { loop: v })} />
        </div>
      ) : null}

      {kind === "svg" || kind === "badge" || (field?.role === "icon") || (field?.tag === "i") ? (
        <div className="space-y-3">
          <SectionTitle>FontAwesome Icon Library</SectionTitle>
          <FontAwesomeIconPicker
            currentClass={edit.iconClass || field?.value || ""}
            onSelect={(cls) => {
              patch(selected, { iconClass: cls, text: "" });
              toast.success(`Icon set to ${cls}`);
            }}
          />
          <ColorInput label="Icon Color" value={edit.fill ?? edit.style?.color ?? "#0ea5a4"} onChange={(v) => patch(selected, { fill: v, style: { color: v } })} />
          <TextInput label="Icon Class name (e.g. fa-solid fa-camera)" value={edit.iconClass ?? ""} placeholder="fa-solid fa-check" onChange={(v) => patch(selected, { iconClass: v })} />
        </div>
      ) : null}

      {kind === "button" || kind === "link" ? (
        <div className="space-y-3">
          <SectionTitle hint={field?.role}>{kind === "button" ? "Button" : "Link"}</SectionTitle>
          <TextInput label="Label" value={edit.text ?? field?.value ?? ""} onChange={(v) => patch(selected, { text: v })} />
          <TextInput label="Destination" value={edit.href ?? field?.attrs["href"] ?? ""} onChange={(v) => patch(selected, { href: v })} />
          <div className="grid grid-cols-2 gap-2">
            {["_self", "_blank"].map((t) => (
              <button
                key={t}
                onClick={() => patch(selected, { target: t })}
                className={cn(
                  "rounded-lg border border-border px-2 py-2 text-[11px] font-semibold transition hover:border-primary/40",
                  (edit.target ?? field?.attrs["target"] ?? "_self") === t && "border-primary bg-primary/12 text-primary",
                )}
              >
                {t === "_self" ? "Same tab" : "New tab"}
              </button>
            ))}
          </div>
          <ColorInput label="Style variant color" value={edit.style?.["background-color"] ?? "#0ea5a4"} onChange={(v) => patch(selected, { style: { "background-color": v } })} />
        </div>
      ) : null}

      {kind === "table" ? (
        <div className="space-y-3">
          <SectionTitle>Table</SectionTitle>
          <p className="text-xs text-muted-foreground">
            {field?.value}. Click a cell in the preview and double-click to edit its content inline; headers behave the same
            way.
          </p>
        </div>
      ) : null}

      <StyleControls edit={edit} patch={patch} id={selected} kind={kind} />
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
    return <EmptyState icon={<Rows3 className="h-5 w-5" />} title="No repeaters on this page" body="Repeaters appear when three or more structurally identical siblings are detected." />;
  }

  const groupedSections = useMemo(() => {
    const map = new Map<string, typeof page.repeaters>();
    page.repeaters.forEach((r) => {
      const sec = r.sectionName || "General Content";
      const list = map.get(sec) ?? [];
      list.push(r);
      map.set(sec, list);
    });
    return Array.from(map.entries());
  }, [page.repeaters]);

  const setItems = (repId: string, items: { key: string; srcIndex: number }[]) =>
    commit({ ...state, repeaters: { ...state.repeaters, [repId]: items } });

  return (
    <div className="fade-up space-y-4">
      <SectionTitle hint={page.name}>Repeaters</SectionTitle>

      {groupedSections.map(([sectionName, repeaters]) => (
        <div key={sectionName} className="space-y-2">
          {/* Section Divider & Header */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              {sectionName}
            </span>
            <div className="h-[1px] flex-1 bg-border/80" />
          </div>

          <div className="space-y-2 pl-1">
            {repeaters.map((r) => {
              const items = state.repeaters[r.id] ?? defaultRepeaterItems(r.itemIds);
              const expanded = open === r.id;
              return (
                <div key={r.id} className="rounded-lg border border-border bg-elevated/40">
                  <div className="flex items-center justify-between gap-1 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : r.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <Rows3 className="text-primary h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{r.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{items.length} items</span>
                      </span>
                      <ConfidenceChip level={r.confidence} />
                    </button>
                    <Btn
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-primary hover:bg-primary/10 gap-1 text-[11px] h-7 px-2"
                      title={`Add new ${r.label.replace(/s$/i, "") || "item"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(r.id);
                        addItem(r.id);
                      }}
                    >
                      <Plus className="h-3 w-3" /> Add
                    </Btn>
                  </div>
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
                                {r.itemLabels[item.srcIndex] ?? `Item ${i + 1}`}
                              </button>
                              <Btn
                                size="icon"
                                variant="ghost"
                                title="Move up"
                                disabled={i === 0}
                                onClick={() => {
                                  const next = [...items];
                                  const [moved] = next.splice(i, 1);
                                  if (moved) next.splice(i - 1, 0, moved);
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
                                  const [moved] = next.splice(i, 1);
                                  if (moved) next.splice(i + 1, 0, moved);
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
                                  next.splice(i + 1, 0, { key: `c${Date.now()}-${items.length}`, srcIndex: item.srcIndex });
                                  setItems(r.id, next);
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Btn>
                              <Btn size="icon" variant="ghost" title="Delete" disabled={items.length <= 1} onClick={() => setItems(r.id, items.filter((_, j) => j !== i))}>
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
                                        <TextInput key={f.id} label={`${f.label}`} value={e.src ?? f.value} onChange={(v) => patch(targetId, { src: v })} />
                                      );
                                    }
                                    if (f.kind === "link" || f.kind === "button") {
                                      return (
                                        <div key={f.id} className="space-y-1.5">
                                          <TextInput label={f.label} value={e.text ?? f.value} onChange={(v) => patch(targetId, { text: v })} />
                                          <TextInput label="Destination" value={e.href ?? f.attrs["href"] ?? ""} onChange={(v) => patch(targetId, { href: v })} />
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
                      <Btn
                        size="sm"
                        className="w-full justify-center"
                        onClick={() => addItem(r.id)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add item
                      </Btn>
                    </div>
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
  const colorKeys: (keyof ThemeTokens)[] = ["primary", "secondary", "accent", "background", "surface", "text", "muted", "border"];
  return (
    <div className="fade-up space-y-4">
      <SectionTitle hint="Changes every page">Site style</SectionTitle>
      <div className="space-y-2">
        {colorKeys.map((k) => (
          <ColorInput key={k} label={k} value={state.theme[k]} onChange={(v) => setTheme({ [k]: v } as Partial<ThemeTokens>)} />
        ))}
      </div>
      <Slider label="Border radius" min={0} max={40} value={parseFloat(state.theme.radius) || 12} onChange={(v) => setTheme({ radius: `${v}px` })} />
      <TextInput label="Heading typeface" value={state.theme.fontHeading} onChange={(v) => setTheme({ fontHeading: v })} />
      <TextInput label="Text typeface" value={state.theme.fontBody} onChange={(v) => setTheme({ fontBody: v })} />
      <TextInput label="Content width" value={state.theme.container} onChange={(v) => setTheme({ container: v })} />
      <TextInput label="Shadow strength" value={state.theme.shadow} onChange={(v) => setTheme({ shadow: v })} />
      <div className="rounded-lg border border-border p-3">
        <SectionTitle>Saved styles</SectionTitle>
        <div className="space-y-1.5">
          {state.themes.map((t) => (
            <div key={t.name} className="flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-2.5 py-2">
              <div className="flex gap-1">
                {colorKeys.slice(0, 4).map((k) => (
                  <span key={k} className="h-4 w-4 rounded border border-border" style={{ background: t.tokens[k] }} />
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
      <Btn size="sm" variant="ghost" className="w-full justify-center" onClick={() => setTheme(analysis.theme)}>
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
        <img src={src} alt={alt} className="h-32 w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="grid h-32 place-items-center text-[11px] font-semibold text-muted-foreground">Preview unavailable</div>
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
  const [kind, setKind] = useState(() => (analysis.assets.some((asset) => asset.kind === "image") ? "image" : "all"));
  const kinds = ["all", ...new Set(analysis.assets.map((a) => a.kind))];
  const list = analysis.assets.filter(
    (a) => (kind === "all" || a.kind === kind) && `${a.name} ${a.url}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="fade-up space-y-3">
      <SectionTitle hint={`${analysis.assets.length} total`}>Asset manager</SectionTitle>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets…" className="h-8 w-full bg-transparent text-xs outline-none" />
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
            .flatMap((page) => page.fields.filter((field) => field.value === a.url).map((field) => state.edits[page.id]?.[field.id]?.src))
            .find((src): src is string => Boolean(src));
          const src = replacement ?? a.url;
          const isImage = a.kind === "image";
          return (
            <div key={a.url} className="rounded-lg border border-border bg-elevated/40 p-2.5">
              <div className="flex items-center gap-2">
                {isImage ? <img src={src} alt="" className="h-9 w-9 shrink-0 rounded border border-border object-cover" /> : null}
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{a.name}</span>
                {a.missing ? <Chip tone="danger">missing</Chip> : null}
                {a.duplicateOf ? <Chip tone="warning">duplicate</Chip> : null}
                {!a.usedOn.length ? <Chip tone="muted">unused</Chip> : null}
              </div>
              <TextInput label="Asset URL" value={src} onChange={(value) => onReplace(a.url, value)} />
              <div className="mt-2 flex gap-1.5">
                <label className="cursor-pointer rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                  Replace local
                  <input type="file" accept={isImage ? "image/*" : undefined} className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onReplace(a.url, URL.createObjectURL(file));
                    e.target.value = "";
                  }} />
                </label>
                <span className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">{a.kind}</span>
                <span className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                  {a.usedOn.length} page{a.usedOn.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          );
        })}
        {!list.length ? <EmptyState icon={<ImageIcon className="h-5 w-5" />} title="No assets match" body="Adjust the search or filter." /> : null}
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
        <TextInput key={k} label={label} value={String(seo[k] ?? "")} onChange={(v) => onChange(k, v)} multiline={k === "description" || k === "ogDescription"} />
      ))}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-3 py-2.5">
        {seo["schema"] ? <Chip tone="success">Schema markup found</Chip> : <Chip tone="warning">No schema markup</Chip>}
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
    return <EmptyState icon={<Link2 className="h-5 w-5" />} title="No navigation detected" body="Menus are detected from header, nav, footer and aside lists." />;
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
                    <button onClick={() => focus(it.id)} className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold">
                      {e.text ?? it.label}
                    </button>
                    <Btn size="icon" variant="ghost" title="Toggle visibility" onClick={() => patch(it.id, { hidden: !e.hidden })}>
                      {e.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Btn>
                  </div>
                  <TextInput label="Label" value={e.text ?? it.label} onChange={(v) => patch(it.id, { text: v })} />
                  <div className="mt-1.5">
                    <TextInput label="Destination" value={e.href ?? it.href} onChange={(v) => patch(it.id, { href: v })} />
                  </div>
                  {it.children.length ? <p className="mt-1.5 text-[10px] text-muted-foreground">{it.children.length} nested items</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValidationPanel({ analysis, focus }: { analysis: TemplateAnalysis; focus: (id: string) => void }) {
  const order = { error: 0, warning: 1, info: 2 } as const;
  const issues = [...analysis.issues].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <div className="fade-up space-y-3">
      <SectionTitle hint={`${issues.filter((i) => i.severity === "error").length} blocking`}>Pre-publish validation</SectionTitle>
      {issues.map((i) => (
        <button
          key={i.id}
          onClick={() => i.elementId && focus(i.elementId)}
          className="block w-full rounded-lg border border-border bg-elevated/40 p-2.5 text-left transition hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <Chip tone={i.severity === "error" ? "danger" : i.severity === "warning" ? "warning" : "primary"}>{i.severity}</Chip>
            <span className="truncate text-[10px] text-muted-foreground">{i.category}</span>
          </div>
          <p className="mt-1.5 text-[11px] font-semibold">{i.message}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{i.fix}</p>
        </button>
      ))}
      {!issues.length ? <EmptyState icon={<Sparkles className="h-5 w-5" />} title="All clear" body="No validation issues detected." /> : null}
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
        Undo and redo are available in the toolbar. Autosave keeps the working draft, and each manual save creates a restorable
        revision.
      </div>
      {revisions.length ? (
        <div className="space-y-1.5">
          {revisions.map((r) => (
            <div key={r.at + r.label} className="flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-2.5 py-2">
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
        <EmptyState icon={<History className="h-5 w-5" />} title="No revisions yet" body="Hit Save in the toolbar to snapshot the current draft." />
      )}
    </div>
  );
}
