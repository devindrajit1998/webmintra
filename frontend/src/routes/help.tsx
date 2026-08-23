import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicKB, getPublicSettings } from "@/lib/public-api";
import { getAuthenticatedUser, routeForRole, type SessionUser } from "@/lib/auth-api";
import {
  HelpCircle,
  Search,
  ArrowRight,
  Sparkles,
  BookOpen,
  ChevronRight,
  Folder,
  Layers,
  Menu,
  X,
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/help")({
  loader: async () => {
    try {
      const [kbData, settings] = await Promise.all([
        getPublicKB({}).catch(() => ({ articles: [] })),
        getPublicSettings().catch(() => ({})),
      ]);
      return { kbData, settings };
    } catch {
      return { kbData: { articles: [] }, settings: {} };
    }
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings || {};
    const articles = loaderData?.kbData?.articles || [];
    const siteName = String(settings["site.name"] || "WebMintra");
    const canonicalBase = String(settings["seo.canonicalUrl"] || "https://webmintra.in").replace(
      /\/$/,
      "",
    );
    const pageUrl = `${canonicalBase}/help`;
    const title = `Help Center, Guides & FAQs | ${siteName}`;
    const description = `Find answers, video tutorials, domain setup guides, and troubleshooting resources for ${siteName}.`;

    const jsonLdBreadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: canonicalBase,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Help Center",
          item: pageUrl,
        },
      ],
    };

    const faqItems = articles.slice(0, 10).map((art: any) => ({
      "@type": "Question",
      name: art.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: art.excerpt || art.content?.replace(/<[^>]*>?/gm, "").slice(0, 300) || art.title,
      },
    }));

    const jsonLdFaq =
      faqItems.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems,
          }
        : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl },
        { property: "og:site_name", content: siteName },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLdBreadcrumb),
        },
        ...(jsonLdFaq
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify(jsonLdFaq),
              },
            ]
          : []),
      ],
    };
  },
  component: PublicHelpCenterPage,
});

export function PublicHelpCenterPage() {
  const [selectedTutorial, setSelectedTutorial] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [user, setUser] = useState<SessionUser | null>(null);

  useState(() => {
    void getAuthenticatedUser().then(setUser);
  });

  const primaryRoute = user ? routeForRole(user.role) : "/create-account";

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["publicKB", selectedCategory, searchQuery],
    queryFn: () =>
      getPublicKB({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        search: searchQuery,
      }),
    staleTime: 1000 * 60 * 2,
  });

  const articles = data?.articles || [];
  const categories = data?.categories || [];

  return (
    <div className="landing-page min-h-screen flex flex-col justify-between tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      {/* ── GLOBAL HEADER NAVIGATION ─────────────────────────────────── */}
      <PublicHeader />

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="flex-1 w-full mx-auto max-w-7xl px-5 sm:px-6 py-12 lg:py-16">
        {/* Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11.5px] font-bold text-[#c2410c] shadow-2xs">
            <span>🇮🇳</span>
            <span>KNOWLEDGE BASE & VIDEO GUIDES</span>
          </div>
          <h1 className="text-[34px] sm:text-[44px] font-extrabold text-[#0f172a] leading-tight">
            How can we help your business website?
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#475569] max-w-lg mx-auto">
            Step-by-step guides on connecting custom .in domains, setting up WhatsApp lead alerts,
            and editing content without coding.
          </p>

          {/* Large Search Bar */}
          <div className="mt-8 relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutorials (e.g. 'domain', 'logo', 'SSL', 'WhatsApp form')..."
              className="w-full rounded-2xl border border-[#cbd5e1] bg-white pl-12 pr-4 py-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="mb-10 flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-2xs ${
              selectedCategory === "all"
                ? "bg-[#059669] text-white shadow-xs"
                : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            All Guides
          </button>
          {categories.map((c: any) => (
            <button
              key={c._id}
              onClick={() => setSelectedCategory(c.slug)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-2xs ${
                selectedCategory === c.slug
                  ? "bg-[#059669] text-white shadow-xs"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs"
              />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white p-16 text-center shadow-xs">
            <BookOpen className="h-12 w-12 text-[#94a3b8] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#0f172a]">No tutorials found</h3>
            <p className="text-sm text-[#64748b] mt-1 max-w-md mx-auto">
              Try searching with another keyword or explore our categories for step-by-step
              instructions.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((art: any) => (
              <button
                key={art._id}
                type="button"
                onClick={() => setSelectedTutorial(art)}
                className="landing-feature-card group flex flex-col justify-between p-6 shadow-xs text-left cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#059669]/40 bg-white"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs mb-3">
                    {art.category && (
                      <span className="rounded-md bg-[#ecfdf5] px-2.5 py-0.5 font-bold text-[#047857] border border-[#a7f3d0] text-[10px]">
                        {art.category.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a] group-hover:text-[#059669] transition leading-snug">
                    {art.title}
                  </h3>
                  <p className="text-xs text-[#64748b] mt-2 line-clamp-2 leading-relaxed">
                    {art.excerpt || art.content?.replace(/<[^>]*>?/gm, "").slice(0, 100)}...
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-[#94a3b8]">
                    Step-by-step guide
                  </span>
                  <span className="font-bold text-[#059669] flex items-center gap-1 group-hover:translate-x-0.5 transition">
                    View Tutorial <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ── TUTORIAL READER MODAL ────────────────────────────────────── */}
      {selectedTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-[#e2e8f0] bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#ecfdf5] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#047857] border border-[#a7f3d0]">
                  {selectedTutorial.category?.name || "Tutorial"}
                </span>
                <span className="text-xs font-semibold text-[#64748b]">Help Center Guide</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTutorial(null)}
                className="rounded-xl border border-[#e2e8f0] bg-white p-2 text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0b192c]"
                title="Close guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10">
              <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0b192c] leading-tight">
                {selectedTutorial.title}
              </h1>

              {selectedTutorial.excerpt && (
                <div className="my-5 rounded-2xl border border-[#fed7aa] bg-[#fff7ed]/60 p-4 text-xs sm:text-sm font-medium text-[#9a3412] leading-relaxed">
                  {selectedTutorial.excerpt}
                </div>
              )}

              {/* Tutorial HTML Content */}
              <article
                className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-[#334155] border-t border-[#f1f5f9] pt-6"
                dangerouslySetInnerHTML={{
                  __html:
                    selectedTutorial.content ||
                    `<p>${selectedTutorial.excerpt || "No further details available for this tutorial."}</p>`,
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5">
              <p className="text-xs text-[#64748b]">
                Need more help?{" "}
                <Link to="/contact" className="font-bold text-[#059669] hover:underline">
                  Contact Support
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setSelectedTutorial(null)}
                className="rounded-xl bg-[#059669] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#047857]"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
