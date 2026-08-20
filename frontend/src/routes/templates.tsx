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
  Menu,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PublicMobileMenu } from "@/components/PublicMobileMenu";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/templates")({
  component: PublicTemplatesCatalogPage,
  head: () => ({ meta: [{ title: "Website Templates Catalog | WebMintra" }] }),
});

export function PublicTemplatesCatalogPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const siteName = settings["site.name"] || "webmintra";
  const logoUrl = settings["brand.logoUrl"];

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
    <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      {/* ── GLOBAL HEADER NAVIGATION ─────────────────────────────────── */}
      <PublicHeader />

      {/* ── MAIN CATALOG CONTENT ────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-5 sm:px-6 py-12 lg:py-16">
        {/* Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11.5px] font-bold text-[#c2410c] shadow-2xs">
            <span>🇮🇳</span>
            <span>READY-TO-LAUNCH BUSINESS TEMPLATES</span>
          </div>
          <h1 className="text-[34px] sm:text-[44px] font-extrabold text-[#0f172a] leading-tight">
            Choose Your Business Website
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#475569] max-w-xl mx-auto">
            Engineered for high local conversion with direct WhatsApp lead routing, instant UPI checkout, and fast Indian edge hosting.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mb-10 space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clinic, gym, cafe, salon, CA..."
                className="w-full rounded-xl border border-[#cbd5e1] bg-white pl-10 pr-9 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-none shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-[#64748b] font-medium">
              Showing <span className="text-[#0f172a] font-bold">{filteredTemplates.length}</span>{" "}
              business template{filteredTemplates.length === 1 ? "" : "s"}
            </p>
          </div>

          {/* Category Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-[#059669] text-white shadow-xs"
                    : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a] hover:border-[#cbd5e1]"
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
                className="animate-pulse rounded-2xl border border-[#e2e8f0] bg-white p-4"
              >
                <div className="aspect-[16/10] w-full rounded-xl bg-[#f1f5f9]" />
                <div className="mt-4 h-5 w-3/4 rounded bg-[#f1f5f9]" />
                <div className="mt-2 h-4 w-1/2 rounded bg-[#f1f5f9]" />
              </div>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white p-16 text-center shadow-xs">
            <Layers className="h-12 w-12 text-[#94a3b8] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#0f172a]">No matching templates found</h3>
            <p className="text-sm text-[#64748b] mt-1 max-w-md mx-auto">
              Try adjusting your category filter or search keywords to explore available business designs.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#047857]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((t: any) => (
              <div
                key={t._id || t.id}
                className="landing-template-card group flex flex-col justify-between p-4"
              >
                <div>
                  {/* Miniature Browser Chrome */}
                  <div className="landing-mini-browser aspect-[16/10] relative">
                    <div className="h-5 bg-[#f1f5f9] border-b border-[#e2e8f0] px-2.5 flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
                      <div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                      <div className="h-2 w-2 rounded-full bg-[#10b981]" />
                      <span className="text-[9px] font-mono text-[#94a3b8] ml-2">
                        {t.category ? `${t.category.toLowerCase()}.in` : "business.in"}
                      </span>
                    </div>

                    <div className="h-[calc(100%-20px)] w-full overflow-hidden relative">
                      <img
                        src={
                          t.thumbnailUrl ||
                          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80"
                        }
                        alt={t.title}
                        className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                      />

                      {/* Top Tag Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="rounded-md bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                          {t.category || "General"}
                        </span>
                        {t.pageCount > 1 && (
                          <span className="rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-bold text-[#0f172a] shadow-xs">
                            {t.pageCount} Pages
                          </span>
                        )}
                      </div>

                      {/* Interactive Actions Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-black/45 backdrop-blur-[2px]">
                        <button
                          onClick={() => {
                            setPreviewId(t._id || t.id);
                            setPreviewActivePage("index.html");
                            setPreviewDevice("desktop");
                          }}
                          className="rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-[#0f172a] shadow-md transition hover:bg-[#f8fafc] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#ea580c]" /> Preview
                        </button>
                        <Link
                          to={primaryRoute}
                          className="rounded-lg bg-[#059669] px-3.5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#047857] flex items-center gap-1.5"
                        >
                          Use Template <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 pb-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[#0f172a] group-hover:text-[#059669] transition truncate">
                        {t.title}
                      </h3>
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                        ⭐ 4.9
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b] line-clamp-2 mt-1 leading-relaxed">
                      {t.description ||
                        `Tailored layout with WhatsApp leads & service rates for ${t.category || "local businesses"}.`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#f1f5f9] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#059669] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> WhatsApp & UPI Ready
                  </span>

                  <button
                    onClick={() => {
                      setPreviewId(t._id || t.id);
                      setPreviewActivePage("index.html");
                      setPreviewDevice("desktop");
                    }}
                    className="text-xs font-bold text-[#059669] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Live <Eye className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── FULLSCREEN MULTI-PAGE PREVIEW MODAL ──────────────────────── */}
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
            <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950/90 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
              {/* Preview Header */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">{fullPreviewTemplate.title}</h2>
                    <p className="text-slate-300 text-xs flex items-center gap-2">
                      <span className="text-[#a7f3d0] font-semibold">
                        {fullPreviewTemplate.category}
                      </span>
                      <span>•</span>
                      <span>Live Multi-Page Preview</span>
                    </p>
                  </div>

                  {pagesList.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 shadow-inner">
                      {pagesList.map((p) => {
                        const isActive = previewActivePage === p.name;
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => setPreviewActivePage(p.name)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                              isActive
                                ? "bg-[#059669] text-white shadow-sm border border-emerald-400/30"
                                : "text-slate-200 hover:text-white hover:bg-slate-800"
                            }`}
                            style={{ color: isActive ? "#ffffff" : "#cbd5e1" }}
                          >
                            <FileText className="h-3.5 w-3.5 opacity-80" />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Viewport Device Controls & Action CTA */}
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-1.5 rounded-md transition-all ${previewDevice === "desktop" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                      title="Desktop View"
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("tablet")}
                      className={`p-1.5 rounded-md transition-all ${previewDevice === "tablet" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                      title="Tablet View"
                    >
                      <Tablet className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1.5 rounded-md transition-all ${previewDevice === "mobile" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                      title="Mobile View"
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>
                  </div>

                  <Link
                    to={primaryRoute}
                    className="rounded-lg bg-[#059669] px-4 py-2 text-xs font-bold text-white hover:bg-[#047857] transition shadow-md flex items-center gap-1.5"
                  >
                    Use This Template <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    onClick={() => {
                      setPreviewId(null);
                      setPreviewActivePage("index.html");
                    }}
                    className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition p-2 rounded-full cursor-pointer"
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

      {/* ── SUB-FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#e2e8f0] bg-white py-8 text-center text-xs text-[#64748b]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {siteName}. All rights reserved.</p>
          <p className="flex items-center gap-1 font-semibold text-[#0f172a]">
            <span>100% Data Stored in India</span> <span>🇮🇳</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
