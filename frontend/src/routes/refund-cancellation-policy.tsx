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
  const supportEmail = settings["site.supportEmail"] || "support@webmintra.com";

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-200 font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#07111f]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <span className="text-[20px] font-black tracking-tight bg-gradient-to-r from-[#0055ff] via-[#00c9a7] to-[#10e793] bg-clip-text text-transparent lowercase">
            {siteName}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
        <div className="rounded-3xl border border-white/10 bg-[#0c1827] p-8 sm:p-12 shadow-2xl space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300 mb-3">
              <RefreshCw className="h-3.5 w-3.5" /> Billing Guidelines
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Refund & Cancellation Policy
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Transparent billing policy for subscriptions, domain add-ons, and renewals
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. 15-Day Free Trial</h2>
              <p>
                Every new {siteName} tenant workspace includes an unrestricted 15-day free trial. No
                credit card is required to begin building, previewing, and testing your website
                templates.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Subscription Cancellation</h2>
              <p>
                You may cancel your monthly or annual subscription at any time directly from your{" "}
                <strong>Tenant Workspace &rarr; Billing</strong> dashboard. Upon cancellation:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>
                  Your website remains active until the end of the current paid billing period.
                </li>
                <li>No further automatic recurring charges will be initiated.</li>
                <li>
                  Your website data and content are preserved for 60 days in case you wish to
                  reactivate.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Refund Terms</h2>
              <p>
                If you encounter technical issues that prevent your website from functioning as
                advertised and our support team is unable to resolve it within 7 business days, you
                are eligible for a full refund of your most recent subscription cycle.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. Refund Processing Time</h2>
              <p>
                Approved refunds are credited back to the original payment method (Bank Account,
                UPI, Credit/Debit Card) within 5 to 7 business days via our payment gateway partner.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">5. How to Request Support</h2>
              <p>
                To request a billing review or refund, email our accounts team at{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-cyan-400 underline font-semibold"
                >
                  {supportEmail}
                </a>{" "}
                with your registered workspace email and invoice reference.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
