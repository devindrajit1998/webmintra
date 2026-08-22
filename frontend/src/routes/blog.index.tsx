import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicBlog, getPublicSettings } from "@/lib/public-api";
import { getAuthenticatedUser, routeForRole, type SessionUser } from "@/lib/auth-api";
import {
  FileText,
  Search,
  ArrowRight,
  Sparkles,
  Calendar,
  User,
  Clock,
  Eye,
  X,
  Menu,
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/blog/")({
  loader: async () => {
    try {
      const settings = await getPublicSettings().catch(() => ({}));
      return { settings };
    } catch {
      return { settings: {} };
    }
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings || {};
    const siteName = String(settings["site.name"] || "WebMintra");
    const canonicalBase = String(settings["seo.canonicalUrl"] || "https://webmintra.in").replace(
      /\/$/,
      "",
    );
    const pageUrl = `${canonicalBase}/blog`;
    const title = `Official Blog - Website Tips, Case Studies & Guides | ${siteName}`;
    const description = `Explore the latest articles on web design, local SEO, online business scaling, and digital growth from ${siteName}.`;
    const ogImage = settings["seo.socialImageUrl"] || settings["brand.logoUrl"] || "";

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
          name: "Blog",
          item: pageUrl,
        },
      ],
    };

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
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
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
      ],
    };
  },
  component: PublicBlogPage,
});

function PublicBlogPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    queryKey: ["publicBlog", selectedCategory, searchQuery],
    queryFn: () =>
      getPublicBlog({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        search: searchQuery,
      }),
    staleTime: 1000 * 60 * 2,
  });

  const posts = data?.posts || [];
  const categories = data?.categories || [];

  return (
    <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      {/* ── GLOBAL HEADER NAVIGATION ─────────────────────────────────── */}
      <PublicHeader />

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-5 sm:px-6 py-12 lg:py-16">
        {/* Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11.5px] font-bold text-[#c2410c] shadow-2xs">
            <span>🇮🇳</span>
            <span>BUSINESS GROWTH ARTICLES & LOCAL SEO GUIDES</span>
          </div>
          <h1 className="text-[34px] sm:text-[44px] font-extrabold text-[#0f172a] leading-tight">
            Guides for Small Business Growth
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#475569] max-w-xl mx-auto">
            Actionable strategies on Google Maps SEO, WhatsApp lead generation, and website growth
            for Indian entrepreneurs.
          </p>
        </div>

        {/* Search & Categories */}
        <div className="mb-10 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides & strategies..."
              className="w-full rounded-xl border border-[#cbd5e1] bg-white pl-10 pr-4 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-none shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                selectedCategory === "all"
                  ? "bg-[#059669] text-white shadow-xs"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              All Articles
            </button>
            {categories.map((c: any) => (
              <button
                key={c._id}
                onClick={() => setSelectedCategory(c.slug)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  selectedCategory === c.slug
                    ? "bg-[#059669] text-white shadow-xs"
                    : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white p-16 text-center shadow-xs">
            <FileText className="h-12 w-12 text-[#94a3b8] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#0f172a]">No articles found</h3>
            <p className="text-sm text-[#64748b] mt-1 max-w-md mx-auto">
              Articles and growth guides will appear here as they are published.
            </p>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post: any) => (
              <Link
                key={post._id}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="landing-template-card group flex flex-col justify-between p-5"
              >
                <div>
                  {post.coverImage || post.featuredImage ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-[#f1f5f9] mb-4 border border-[#e2e8f0]">
                      <img
                        src={post.coverImage || post.featuredImage}
                        alt={post.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 text-xs mb-2">
                    {post.category && (
                      <span className="rounded-md bg-[#ecfdf5] px-2.5 py-0.5 font-bold text-[#047857] border border-[#a7f3d0] text-[10px]">
                        {post.category.name}
                      </span>
                    )}
                    <span className="text-[#cbd5e1]">•</span>
                    <span className="flex items-center gap-1 text-[#64748b] text-[11px]">
                      <Clock className="h-3 w-3" /> {post.readingTimeMinutes || 3} min read
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#0f172a] group-hover:text-[#059669] transition leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs text-[#64748b] mt-2 line-clamp-3 leading-relaxed">
                    {post.excerpt || post.content?.replace(/<[^>]*>?/gm, "").slice(0, 140)}...
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#f1f5f9] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[#64748b]">
                    <User className="h-3.5 w-3.5 text-[#94a3b8]" />
                    <span>{post.author?.name || "WebMintra Team"}</span>
                  </div>

                  <span className="text-xs font-bold text-[#059669] flex items-center gap-1 group-hover:translate-x-0.5 transition">
                    Read Article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
