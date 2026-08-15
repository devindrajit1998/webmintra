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
} from "lucide-react";

export const Route = createFileRoute("/help")({
  component: PublicHelpCenterPage,
  head: () => ({ meta: [{ title: "Help Center & Tutorials | WebMintra" }] }),
});

export function PublicHelpCenterPage() {
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
              to="/contact"
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Contact Support
            </Link>
            <Link
              to={primaryRoute}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-cyan-500 px-5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-cyan-400"
            >
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        {/* Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-md mb-4">
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" /> Knowledge Base & Tutorials
          </span>
          <h1 className="font-display text-4xl font-extrabold text-white sm:text-5xl tracking-tight">
            How can we help your website?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Step-by-step guides on connecting custom domains, setting up enquiry forms, and editing
            content.
          </p>

          {/* Large Search Bar */}
          <div className="mt-8 relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutorials (e.g. 'domain', 'logo', 'SSL', 'lead form')..."
              className="w-full rounded-2xl border border-cyan-500/30 bg-[#0c1827] pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none shadow-[0_0_30px_rgba(6,182,212,0.1)]"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="mb-10 flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-5 py-2 text-xs font-bold transition ${
              selectedCategory === "all"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "border border-white/10 bg-[#0c1827] text-slate-400 hover:text-white"
            }`}
          >
            All Guides
          </button>
          {categories.map((c: any) => (
            <button
              key={c._id}
              onClick={() => setSelectedCategory(c.slug)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                selectedCategory === c.slug
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "border border-white/10 bg-[#0c1827] text-slate-400 hover:text-white"
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
                className="h-32 animate-pulse rounded-2xl border border-white/10 bg-[#0c1827] p-5"
              />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#091521] p-16 text-center">
            <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">No tutorials found</h3>
            <p className="text-sm text-slate-400 mt-1">
              Tutorials added in the Admin Knowledge Base will automatically sync here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((art: any) => (
              <div
                key={art._id}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1c2e] to-[#0a1523] p-5 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    {art.category && (
                      <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 font-bold text-cyan-400 border border-cyan-500/20">
                        {art.category.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition leading-snug">
                    {art.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {art.excerpt || art.content?.replace(/<[^>]*>?/gm, "").slice(0, 100)}...
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Step-by-step guide</span>
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                    View Tutorial <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
