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
} from "lucide-react";

export const Route = createFileRoute("/blog")({
  component: PublicBlogPage,
  head: () => ({ meta: [{ title: "Blog & Local Business Guides | WebMintra" }] }),
});

export function PublicBlogPage() {
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
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Home
            </Link>
            <Link
              to="/templates"
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Templates
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
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Articles & Advice
          </span>
          <h1 className="font-display text-4xl font-extrabold text-white sm:text-5xl tracking-tight">
            Guides for Small Business Growth
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Actionable strategies on local SEO, website design, and customer acquisition for Indian
            business owners.
          </p>
        </div>

        {/* Search & Categories */}
        <div className="mb-10 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides & tutorials..."
              className="w-full rounded-full border border-white/10 bg-[#0c1827] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                selectedCategory === "all"
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "border border-white/10 bg-[#0c1827] text-slate-400 hover:text-white"
              }`}
            >
              All Articles
            </button>
            {categories.map((c: any) => (
              <button
                key={c._id}
                onClick={() => setSelectedCategory(c.slug)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  selectedCategory === c.slug
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "border border-white/10 bg-[#0c1827] text-slate-400 hover:text-white"
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
                className="h-64 animate-pulse rounded-2xl border border-white/10 bg-[#0c1827] p-6"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#091521] p-16 text-center">
            <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">No articles found</h3>
            <p className="text-sm text-slate-400 mt-1">
              Articles published from the Admin Blog section will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post: any) => (
              <article
                key={post._id}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1c2e] to-[#0a1523] p-5 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:-translate-y-1"
              >
                <div>
                  {post.featuredImage && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-900 mb-4">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    {post.category && (
                      <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 font-bold text-cyan-400 border border-cyan-500/20">
                        {post.category.name}
                      </span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {post.readingTimeMinutes || 3} min read
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-sm text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {post.excerpt || post.content?.replace(/<[^>]*>?/gm, "").slice(0, 140)}...
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>{post.author?.name || "WebMintra Team"}</span>
                  </div>

                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                    Read Article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
