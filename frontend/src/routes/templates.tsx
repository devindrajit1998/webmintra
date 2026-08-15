import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicTemplates,
  getPublicTemplateCategories,
  getPublicTemplatePreview,
  getPublicSettings,
} from "@/lib/public-api";
import { getAuthenticatedUser, routeForRole, type SessionUser } from "@/lib/auth-api";
import {
  Eye,
  ArrowRight,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  X,
  Search,
  CheckCircle2,
  Filter,
  Layers,
  Globe,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  component: PublicTemplatesCatalogPage,
  head: () => ({ meta: [{ title: "Website Templates Catalog | WebMintra" }] }),
});

export function PublicTemplatesCatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewActivePage, setPreviewActivePage] = useState<string>("index.html");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    void getAuthenticatedUser().then(setUser);
  }, []);

  const primaryRoute = user ? routeForRole(user.role) : "/create-account";

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["publicTemplateCategories"],
    queryFn: getPublicTemplateCategories,
    staleTime: 1000 * 60 * 5,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["publicTemplatesList", selectedCategory],
    queryFn: () =>
      getPublicTemplates({
        category: selectedCategory === "All" ? undefined : selectedCategory,
        limit: 100,
      }),
    staleTime: 1000 * 60 * 2,
  });

  const { data: fullPreviewTemplate } = useQuery({
    queryKey: ["publicTemplateDetail", previewId],
    queryFn: () => (previewId ? getPublicTemplatePreview(previewId) : null),
    enabled: Boolean(previewId),
    staleTime: 1000 * 60 * 5,
  });

  const filteredTemplates = useMemo(() => {
    return templates.filter((t: any) => {
      const matchSearch =
        !searchQuery.trim() ||
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [templates, searchQuery]);

  const allCategories = ["All", ...categories];

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#07111f]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-3 font-display text-lg font-bold text-white transition hover:opacity-80"
          >
            {settings["brand.logoUrl"] ? (
              <img src={settings["brand.logoUrl"]} alt="Logo" className="h-9 w-9 object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500 text-white">
                <span className="font-bold">{(settings["site.name"] || "W").charAt(0)}</span>
              </span>
            )}
            <span className="text-[22px] font-black tracking-tight leading-none bg-gradient-to-r from-[#0055ff] via-[#00c9a7] to-[#10e793] bg-clip-text text-transparent lowercase font-sans">
              {settings["site.name"] || "webmintra"}
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm font-semibold text-slate-400 hover:text-white transition hidden sm:inline-block"
            >
              Home
            </Link>
            <Link
              to={user ? routeForRole(user.role) : "/sign-in"}
              className="text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              to={primaryRoute}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-cyan-500 px-5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-cyan-400"
            >
              Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        {/* Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-md mb-4">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Template Catalog
          </span>
          <h1 className="font-display text-4xl font-extrabold text-white sm:text-5xl tracking-tight">
            Choose Your Business Website
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Engineered for high local conversion, fast load speed, and easy editing without coding.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mb-10 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by category, clinic, gym, cafe..."
                className="w-full rounded-full border border-white/10 bg-[#0c1827] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Showing <span className="text-white font-bold">{filteredTemplates.length}</span>{" "}
              active template{filteredTemplates.length === 1 ? "" : "s"}
            </p>
          </div>

          {/* Category Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "border border-white/10 bg-[#0c1827] text-slate-400 hover:text-white hover:border-white/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-white/10 bg-[#0c1827] p-4"
              >
                <div className="aspect-[16/10] w-full rounded-xl bg-slate-800" />
                <div className="mt-4 h-5 w-3/4 rounded bg-slate-800" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#091521] p-16 text-center">
            <Layers className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">No matching templates found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Try adjusting your category filter or search keywords to explore available business
              designs.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((t: any) => (
              <div
                key={t._id || t.id}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1c2e] to-[#0a1523] p-4 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:-translate-y-1.5"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-900 border border-white/5">
                    <img
                      src={
                        t.thumbnailUrl ||
                        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80"
                      }
                      alt={t.title}
                      className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                    />

                    {/* Top Tag Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="rounded-full bg-slate-950/85 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-400 border border-cyan-500/30">
                        {t.category || "General"}
                      </span>
                      {t.pageCount > 1 && (
                        <span className="rounded-full bg-slate-950/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-slate-300 border border-white/10">
                          {t.pageCount} Pages
                        </span>
                      )}
                    </div>

                    {/* Interactive Actions Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-slate-950/65 backdrop-blur-[2px]">
                      <button
                        onClick={() => {
                          setPreviewId(t._id || t.id);
                          setPreviewActivePage("index.html");
                          setPreviewDevice("desktop");
                        }}
                        className="rounded-full bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Live Preview
                      </button>
                      <Link
                        to={primaryRoute}
                        className="rounded-full bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition hover:bg-emerald-400 flex items-center gap-1.5"
                      >
                        Use Template <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="pt-4 pb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition truncate">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {t.description ||
                        `Modern, responsive website layout designed specifically for ${t.category || "businesses"}.`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Live Ready
                  </span>

                  <button
                    onClick={() => {
                      setPreviewId(t._id || t.id);
                      setPreviewActivePage("index.html");
                      setPreviewDevice("desktop");
                    }}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    Interactive Preview <Eye className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FULLSCREEN MULTI-PAGE PREVIEW MODAL */}
      {previewId &&
        fullPreviewTemplate &&
        (() => {
          const pagesList = [
            { name: "index.html", content: fullPreviewTemplate.htmlContent || "" },
            ...(fullPreviewTemplate.pages || []).map((p: any) => ({
              name: p.name,
              content: p.htmlContent || "",
            })),
          ];
          const activePageObj = pagesList.find((p) => p.name === previewActivePage) || pagesList[0];

          const injectedScript = `
        <script>
        document.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href');
          if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
          if (href.startsWith('http://') || href.startsWith('https://')) return;
          
          e.preventDefault();
          var targetName = href.replace(/^\\//, '').replace(/\\.html$/, '') + '.html';
          if (href === '/' || href === '/index.html' || href === 'index.html') targetName = 'index.html';
          window.parent.postMessage({ type: 'catalog-preview-navigate', targetName: targetName }, '*');
        }, true);
        </script>
        `;
          const previewHtml = activePageObj?.content ? activePageObj.content + injectedScript : "";

          return (
            <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
              {/* Preview Header */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">{fullPreviewTemplate.title}</h2>
                    <p className="text-slate-400 text-xs flex items-center gap-2">
                      <span className="text-cyan-400 font-semibold">
                        {fullPreviewTemplate.category}
                      </span>
                      <span>•</span>
                      <span>Live Multi-Page Preview</span>
                    </p>
                  </div>

                  {pagesList.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
                      {pagesList.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => setPreviewActivePage(p.name)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                            previewActivePage === p.name
                              ? "bg-cyan-500 text-slate-950 shadow-sm"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Viewport Device Controls & Action CTA */}
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-1.5 rounded-md transition-all ${previewDevice === "desktop" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Desktop View"
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("tablet")}
                      className={`p-1.5 rounded-md transition-all ${previewDevice === "tablet" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Tablet View"
                    >
                      <Tablet className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1.5 rounded-md transition-all ${previewDevice === "mobile" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Mobile View"
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>
                  </div>

                  <Link
                    to={primaryRoute}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shadow-md flex items-center gap-1.5"
                  >
                    Use This Template <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    onClick={() => {
                      setPreviewId(null);
                      setPreviewActivePage("index.html");
                    }}
                    className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition p-2 rounded-full cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Iframe Viewport Frame */}
              <div className="flex-1 flex justify-center w-full min-h-0">
                <div
                  className={`h-full rounded-2xl overflow-hidden bg-white border border-slate-700 shadow-2xl transition-all duration-300 ${
                    previewDevice === "desktop"
                      ? "w-full"
                      : previewDevice === "tablet"
                        ? "w-[768px]"
                        : "w-[375px]"
                  }`}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0 bg-white"
                    title="Live Template Preview"
                    onLoad={() => {
                      const handleMessage = (event: MessageEvent) => {
                        if (
                          event.data?.type === "catalog-preview-navigate" &&
                          event.data.targetName
                        ) {
                          const target = event.data.targetName;
                          if (pagesList.some((p) => p.name === target)) {
                            setPreviewActivePage(target);
                          } else {
                            toast.error(`Page "${target}" is not part of this preview.`);
                          }
                        }
                      };
                      window.addEventListener("message", handleMessage);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
