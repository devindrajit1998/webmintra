import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { RefreshCw } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/refund-cancellation-policy")({
  component: RefundCancellationPolicyPage,
  head: () => ({ meta: [{ title: "Refund & Cancellation Policy | WebMintra" }] }),
});

function RefundCancellationPolicyPage() {
  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const siteName = settings["site.name"] || "WebMintra";
  const supportEmail = settings["site.supportEmail"] || "support@webmintra.in";
  const policyContent = settings["content.refundCancellationPolicy"];

  return (
    <div className="landing-page min-h-screen flex flex-col justify-between tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      <PublicHeader />

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="flex-1 w-full mx-auto max-w-7xl px-5 sm:px-6 py-10 lg:py-14 space-y-8">
        {/* Banner Header */}
        <div className="content-page-header px-6 py-6 sm:px-8 sm:py-7">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ea580c] tracking-tight">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#0f172a] mt-1">{siteName}</p>
          <p className="text-[11px] sm:text-xs text-[#64748b] mt-3">
            Effective Date: 23 August 2026
          </p>
        </div>

        {/* Content Body */}
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 sm:p-12 shadow-sm">
          {typeof policyContent === "string" && policyContent.trim() ? (
            <article
              className="legal-content prose prose-slate max-w-none text-sm leading-relaxed text-[#475569]"
              dangerouslySetInnerHTML={{ __html: policyContent }}
            />
          ) : (
            <div className="legal-content space-y-6 text-sm text-[#475569] leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">1. 14-Day Free Trial</h2>
                <p>
                  Every new {siteName} business workspace includes an unrestricted 14-day free
                  trial. No credit card or upfront payment is required to begin building,
                  customizing templates, and testing your website.
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
                    Your website data and uploaded media are preserved safely for 60 days in case
                    you wish to reactivate.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">3. Refund Terms</h2>
                <p>
                  If you encounter technical issues that prevent your website from functioning as
                  advertised and our support team is unable to resolve it within 7 business days,
                  you are eligible for a full refund of your most recent subscription cycle.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">4. Refund Processing Time</h2>
                <p>
                  Approved refunds are credited back to the original Indian payment method (UPI,
                  Bank Account, NetBanking, Debit/Credit Card) within 5 to 7 business days via our
                  RBI-authorized payment partner.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">5. How to Request Support</h2>
                <p>
                  To request a billing review or refund, email our accounts team at{" "}
                  <a href={`mailto:${supportEmail}`} className="text-[#059669] underline font-bold">
                    {supportEmail}
                  </a>{" "}
                  with your registered workspace email and GST invoice number.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
