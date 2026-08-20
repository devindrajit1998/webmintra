import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  X,
  Sparkles,
  Layers,
  Briefcase,
  Zap,
  MessageSquare,
  Compass,
  FileEdit,
  HelpCircle,
  Phone,
  ArrowRight,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth-api";

interface PublicMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user?: SessionUser | null;
  primaryRoute?: string;
  siteName?: string;
  logoUrl?: string;
  isLandingPage?: boolean;
}

export function PublicMobileMenu({
  isOpen,
  onClose,
  user,
  primaryRoute = "/create-account",
  siteName = "webmintra",
  logoUrl,
  isLandingPage = false,
}: PublicMobileMenuProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const getHashUrl = (hash: string) => {
    return isLandingPage ? hash : `/${hash}`;
  };

  return (
    <>
      {/* Dark Overlay Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-[#0b192c]/60 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Slide-Over Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[70] flex w-[86vw] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#e2e8f0] px-5">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2.5 transition hover:opacity-90"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-7 w-auto object-contain" />
            ) : (
              <div className="relative flex h-7 w-7 items-center justify-center">
                <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
                  <path
                    d="M4 8L10 24L16 12L22 24L28 8"
                    stroke="#ea580c"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="16" cy="24" r="3" fill="#059669" />
                </svg>
              </div>
            )}
            <span className="text-[20px] font-black tracking-tight text-[#0f172a] lowercase">
              {siteName}
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-2 px-2 text-[10.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
            Navigation
          </div>
          <nav aria-label="Mobile primary navigation" className="space-y-1">
            <a
              onClick={onClose}
              href={getHashUrl("#product")}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] hover:text-[#ea580c] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff7ed] text-[#ea580c] group-hover:scale-105 transition-transform">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span>Product Features</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#cbd5e1] group-hover:text-[#ea580c] group-hover:translate-x-0.5 transition" />
            </a>

            <Link
              to="/templates"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] hover:text-[#059669] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] group-hover:scale-105 transition-transform">
                  <Layers className="h-4 w-4" />
                </div>
                <span>Templates</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#cbd5e1] group-hover:text-[#059669] group-hover:translate-x-0.5 transition" />
            </Link>

            <a
              onClick={onClose}
              href={getHashUrl("#solutions")}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] hover:text-[#0284c7] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f9ff] text-[#0284c7] group-hover:scale-105 transition-transform">
                  <Briefcase className="h-4 w-4" />
                </div>
                <span>Solutions</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#cbd5e1] group-hover:text-[#0284c7] group-hover:translate-x-0.5 transition" />
            </a>

            <a
              onClick={onClose}
              href={getHashUrl("#pricing")}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] hover:text-[#ea580c] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff7ed] text-[#ea580c] group-hover:scale-105 transition-transform">
                  <Zap className="h-4 w-4" />
                </div>
                <span>Pricing Plans</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#cbd5e1] group-hover:text-[#ea580c] group-hover:translate-x-0.5 transition" />
            </a>

            <a
              onClick={onClose}
              href={getHashUrl("#faq")}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] hover:text-[#475569] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#64748b] group-hover:scale-105 transition-transform">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span>FAQ & Resources</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#cbd5e1] group-hover:text-[#475569] group-hover:translate-x-0.5 transition" />
            </a>
          </nav>

          <div className="my-4 border-t border-[#e2e8f0]" />

          <div className="mb-2 px-2 text-[10.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
            Quick Pages
          </div>
          <nav aria-label="Mobile quick links" className="space-y-1">
            <Link
              to="/templates"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition"
            >
              <div className="flex items-center gap-2.5">
                <Compass className="h-3.5 w-3.5 text-[#94a3b8]" />
                <span>Browse All Templates</span>
              </div>
              <ExternalLink className="h-3 w-3 text-[#94a3b8]" />
            </Link>

            <Link
              to="/blog"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition"
            >
              <div className="flex items-center gap-2.5">
                <FileEdit className="h-3.5 w-3.5 text-[#94a3b8]" />
                <span>Blog & Insights</span>
              </div>
            </Link>

            <Link
              to="/help"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-3.5 w-3.5 text-[#94a3b8]" />
                <span>Help Center</span>
              </div>
            </Link>

            <Link
              to="/contact"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition"
            >
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-[#94a3b8]" />
                <span>Contact & WhatsApp</span>
              </div>
            </Link>
          </nav>
        </div>

        {/* Drawer Footer Actions */}
        <div className="border-t border-[#e2e8f0] bg-[#fafafa] p-4 space-y-2.5">
          <Link
            to={primaryRoute}
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-md hover:bg-[#047857] active:scale-[0.98] transition"
          >
            <span>Create Your Website</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            to={user ? (user.role === "admin" ? "/admin" : "/tenant") : "/sign-in"}
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center rounded-xl border border-[#cbd5e1] bg-white text-xs font-bold text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition"
          >
            {user ? "Go to Dashboard" : "Sign In to Your Account"}
          </Link>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-semibold text-[#64748b]">
            <span>🇮🇳</span>
            <span>Crafted for Indian Entrepreneurs</span>
          </div>
        </div>
      </div>
    </>
  );
}
