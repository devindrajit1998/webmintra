import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { useState } from "react";
import { getAuthenticatedUser, routeForRole, type SessionUser } from "@/lib/auth-api";

export function PublicFooter() {
  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const [user, setUser] = useState<SessionUser | null>(null);
  useState(() => {
    void getAuthenticatedUser().then(setUser);
  });

  const primaryRoute = user ? routeForRole(user.role) : "/create-account";
  const siteName = String(settings["site.name"] || "WebMintra");

  return (
    <footer className="w-full mt-auto border-t border-[#e2e8f0] bg-white text-[#64748b]">
      {/* Main Footer Container */}
      <div className="mx-auto max-w-7xl px-5 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Column 1: Brand & Bio */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <svg
                width="28"
                height="28"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <path
                  d="M4 10 L10 26 L16 14 L22 26 L28 10"
                  stroke="#ea580c"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 14 L16 26 L22 14 L28 26 L34 10"
                  stroke="#059669"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="19" cy="18" r="2.5" fill="#1e3a8a" />
              </svg>
              <span className="text-xl font-black tracking-tight text-[#0f172a]">
                web<span className="text-[#059669]">mintra</span>
              </span>
            </Link>

            <p className="text-xs text-[#475569] leading-relaxed max-w-sm">
              WebMintra is a website builder for small businesses that makes it easy to create and
              manage professional business websites. Choose ready-made website templates, customize
              your business content, connect your domain, and publish your website without the
              complexity of traditional development.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
                <span>🇮🇳</span>
                <span>100% Data Stored in India</span>
              </div>
            </div>
          </div>

          {/* Column 2: Product */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f172a] mb-3.5">
              Product
            </h4>
            <ul className="space-y-2 text-xs font-medium text-[#475569]">
              <li>
                <Link to="/" className="transition hover:text-[#059669]">
                  Website Builder
                </Link>
              </li>
              <li>
                <Link to="/templates" className="transition hover:text-[#059669]">
                  Templates Gallery
                </Link>
              </li>
              <li>
                <Link to="/help" className="transition hover:text-[#059669]">
                  Features & Tools
                </Link>
              </li>
              <li>
                <Link to="/templates" className="transition hover:text-[#059669]">
                  Custom Domains
                </Link>
              </li>
              <li>
                <Link to={primaryRoute} className="transition hover:text-[#059669]">
                  Create Website
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources & Guides */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f172a] mb-3.5">
              Resources
            </h4>
            <ul className="space-y-2 text-xs font-medium text-[#475569]">
              <li>
                <Link to="/blog" className="transition hover:text-[#059669]">
                  Business Blog
                </Link>
              </li>
              <li>
                <Link to="/help" className="transition hover:text-[#059669]">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/help" className="transition hover:text-[#059669]">
                  SEO & Setup Guides
                </Link>
              </li>
              <li>
                <Link to="/contact" className="transition hover:text-[#059669]">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Trust */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f172a] mb-3.5">
              Legal & Trust
            </h4>
            <ul className="space-y-2 text-xs font-medium text-[#475569]">
              <li>
                <Link to="/privacy-policy" className="transition hover:text-[#059669]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="transition hover:text-[#059669]">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/refund-cancellation-policy" className="transition hover:text-[#059669]">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/contact" className="transition hover:text-[#059669]">
                  Customer Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* SEO Internal Link Strip */}
        <div className="mt-12 pt-6 border-t border-[#e2e8f0] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-[#64748b]">
          <Link to="/" className="hover:text-[#059669] transition">
            Website Builder
          </Link>
          <span>|</span>
          <Link to="/templates" className="hover:text-[#059669] transition">
            Templates
          </Link>
          <span>|</span>
          <Link to="/blog" className="hover:text-[#059669] transition">
            Business Blog
          </Link>
          <span>|</span>
          <Link to="/help" className="hover:text-[#059669] transition">
            Help Center
          </Link>
          <span>|</span>
          <Link to="/contact" className="hover:text-[#059669] transition">
            Contact Us
          </Link>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-[#059669] transition">
              Privacy
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-[#059669] transition">
              Terms
            </Link>
            <Link to="/refund-cancellation-policy" className="hover:text-[#059669] transition">
              Refunds
            </Link>
            <span className="font-semibold text-[#0f172a] flex items-center gap-1">
              <span>Bharat Cloud Edge</span> <span>🇮🇳</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
