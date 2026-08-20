import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { getAuthenticatedUser, routeForRole, type SessionUser } from "@/lib/auth-api";
import { Menu } from "lucide-react";
import { PublicMobileMenu } from "./PublicMobileMenu";

interface PublicHeaderProps {
  isLandingPage?: boolean;
}

export function PublicHeader({ isLandingPage = false }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useState(() => {
    void getAuthenticatedUser().then(setUser);
  });

  const primaryRoute = user ? routeForRole(user.role) : "/create-account";

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const logoUrl = settings["brand.logoUrl"];
  const siteName = settings["site.name"] || "webmintra";

  return (
    <>
      <header className="landing-nav-glass sticky top-0 z-40 w-full border-b border-[#e2e8f0]/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="h-8 max-w-[180px] object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ea580c] to-[#059669] text-white shadow-xs font-bold text-sm">
                W
              </div>
            )}
            <span className="text-[22px] font-black tracking-tight text-[#0f172a] lowercase font-sans">
              {siteName}
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 sm:gap-2 lg:gap-3 text-[13.5px] font-semibold text-[#475569] md:flex"
          >
            {isLandingPage ? (
              <>
                <a href="#product" className="landing-nav-link text-[#475569] hover:text-[#0f172a]">
                  Product
                </a>
                <Link
                  to="/templates"
                  className={`landing-nav-link ${
                    currentPath.startsWith("/templates") ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Templates
                </Link>
                <a href="#solutions" className="landing-nav-link text-[#475569] hover:text-[#0f172a]">
                  Solutions
                </a>
                <a href="#pricing" className="landing-nav-link text-[#475569] hover:text-[#0f172a]">
                  Pricing
                </a>
                <Link
                  to="/blog"
                  className={`landing-nav-link ${
                    currentPath.startsWith("/blog") ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Blog
                </Link>
                <Link
                  to="/help"
                  className={`landing-nav-link ${
                    currentPath.startsWith("/help") ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Help Center
                </Link>
                <Link
                  to="/contact"
                  className={`landing-nav-link ${
                    currentPath === "/contact" ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Contact
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={`landing-nav-link ${
                    currentPath === "/" ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/templates"
                  className={`landing-nav-link ${
                    currentPath.startsWith("/templates") ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Templates
                </Link>
                <Link
                  to="/blog"
                  className={`landing-nav-link ${
                    currentPath.startsWith("/blog") ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Blog
                </Link>
                <Link
                  to="/help"
                  className={`landing-nav-link ${
                    currentPath.startsWith("/help") ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Help Center
                </Link>
                <Link
                  to="/contact"
                  className={`landing-nav-link ${
                    currentPath === "/contact" ? "text-[#0f172a] font-bold" : "text-[#475569]"
                  }`}
                >
                  Contact
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3.5">
            <Link
              to={user ? routeForRole(user.role) : "/sign-in"}
              className="text-[14px] font-bold text-[#0f172a] hover:text-[#059669] transition px-2 py-1"
            >
              Login
            </Link>
            <Link
              to={primaryRoute}
              className="hidden h-10 items-center justify-center rounded-xl bg-[#059669] px-5 text-[13.5px] font-bold text-white shadow-sm transition hover:bg-[#047857] active:scale-[0.98] sm:inline-flex"
            >
              Create Your Website
            </Link>

            {/* Mobile Menu Toggle Button (Strictly hidden on desktop) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              className="md:!hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9] transition"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Slide-over Drawer */}
      <PublicMobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        primaryRoute={primaryRoute}
        siteName={siteName}
        logoUrl={logoUrl}
        isLandingPage={isLandingPage}
      />
    </>
  );
}
