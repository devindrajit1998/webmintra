import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/refund-cancellation-policy")({
  component: RefundCancellationPolicyPage,
  head: () => ({ meta: [{ title: "Refund & Cancellation Policy | WebMintra" }] }),
});

export function RefundCancellationPolicyPage() {
  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const siteName = settings["site.name"] || "WebMintra";
  const supportEmail = settings["site.supportEmail"] || "support@webmintra.in";

  return (
    <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      {/* ── HEADER NAVIGATION ────────────────────────────────────────── */}
      <header className="landing-nav-glass sticky top-0 z-40 w-full">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-bold text-[#475569] hover:text-[#0f172a] transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <span className="text-[21px] font-black tracking-tight text-[#0f172a] lowercase">
            {siteName}
          </span>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-5 sm:px-6 py-12 lg:py-16">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 sm:p-12 shadow-sm space-y-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11px] font-bold text-[#c2410c] shadow-2xs">
              <RefreshCw className="h-3.5 w-3.5" /> Billing Guidelines
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a]">
              Refund & Cancellation Policy
            </h1>
            <p className="text-xs text-[#64748b] mt-2">
              Transparent billing policy for Indian subscriptions, UPI payments, and GST renewals
            </p>
          </div>

          <div className="space-y-6 text-sm text-[#475569] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">1. 14-Day Free Trial</h2>
              <p>
                Every new {siteName} business workspace includes an unrestricted 14-day free trial. No credit card or upfront payment is required to begin building, customizing templates, and testing your website.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">2. Subscription Cancellation</h2>
              <p>
                You may cancel your monthly or annual subscription at any time directly from your{" "}
                <strong>Tenant Workspace &rarr; Billing</strong> dashboard. Upon cancellation:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[#64748b]">
                <li>
                  Your website remains active until the end of the current paid billing period.
                </li>
                <li>No further automatic recurring charges will be initiated.</li>
                <li>
                  Your website data and uploaded media are preserved safely for 60 days in case you wish to reactivate.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">3. Refund Terms</h2>
              <p>
                If you encounter technical issues that prevent your website from functioning as advertised and our support team is unable to resolve it within 7 business days, you are eligible for a full refund of your most recent subscription cycle.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">4. Refund Processing Time</h2>
              <p>
                Approved refunds are credited back to the original Indian payment method (UPI, Bank Account, NetBanking, Debit/Credit Card) within 5 to 7 business days via our RBI-authorized payment partner.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">5. How to Request Support</h2>
              <p>
                To request a billing review or refund, email our accounts team at{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-[#059669] underline font-bold"
                >
                  {supportEmail}
                </a>{" "}
                with your registered workspace email and GST invoice number.
              </p>
            </section>
          </div>
        </div>
      </main>

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
