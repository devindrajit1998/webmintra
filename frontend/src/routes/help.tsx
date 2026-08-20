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
} from "lucide-react";
import { PublicMobileMenu } from "@/components/PublicMobileMenu";

export const Route = createFileRoute("/help")({
  component: PublicHelpCenterPage,
  head: () => ({ meta: [{ title: "Help Center & Tutorials | WebMintra" }] }),
});

export function PublicHelpCenterPage() {
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
    <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      {/* ── HEADER NAVIGATION ────────────────────────────────────────── */}
      <header className="landing-nav-glass sticky top-0 z-40 w-full">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-6">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            {settings["brand.logoUrl"] ? (
              <img src={settings["brand.logoUrl"]} alt={settings["site.name"] || "webmintra"} className="h-8 w-auto object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ea580c] to-[#059669] text-white shadow-xs font-bold text-sm">
                W
              </div>
            )}
            <span className="text-[21px] font-black tracking-tight text-[#0f172a] lowercase">
              {settings["site.name"] || "webmintra"}
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-[#475569] md:flex">
            <Link to="/" className="landing-nav-link text-[#475569]">
              Home
            </Link>
            <Link to="/templates" className="landing-nav-link text-[#475569]">
              Templates
            </Link>
            <Link to="/blog" className="landing-nav-link text-[#475569]">
              Blog
            </Link>
            <Link to="/help" className="landing-nav-link text-[#0f172a] font-bold">
              Help Center
            </Link>
            <Link to="/contact" className="landing-nav-link text-[#475569]">
              Contact
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to={user ? routeForRole(user.role) : "/sign-in"}
              className="text-[13.5px] font-bold text-[#0f172a] hover:text-[#059669] transition px-2 py-1"
            >
              Log in
            </Link>
            <Link
              to={primaryRoute}
              className="hidden h-9 items-center justify-center rounded-lg bg-[#059669] px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#047857] sm:inline-flex"
            >
              Get Started Free
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              className="landing-icon-button md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9] transition"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Drawer */}
      <PublicMobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        primaryRoute={primaryRoute}
        siteName={settings["site.name"] || "webmintra"}
        logoUrl={settings["brand.logoUrl"]}
        isLandingPage={false}
      />

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-5 sm:px-6 py-12 lg:py-16">
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
            Step-by-step guides on connecting custom .in domains, setting up WhatsApp lead alerts, and editing content without coding.
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
              Try searching with another keyword or explore our categories for step-by-step instructions.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((art: any) => (
              <div
                key={art._id}
                className="landing-feature-card group flex flex-col justify-between p-6 shadow-xs"
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
                  <span className="text-[11px] font-semibold text-[#94a3b8]">Step-by-step guide</span>
                  <span className="font-bold text-[#059669] flex items-center gap-1 group-hover:translate-x-0.5 transition">
                    View Tutorial <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── SUB-FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#e2e8f0] bg-white py-8 text-center text-xs text-[#64748b]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {settings["site.name"] || "webmintra"}. All rights reserved.</p>
          <p className="flex items-center gap-1 font-semibold text-[#0f172a]">
            <span>100% Data Stored in India</span> <span>🇮🇳</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
