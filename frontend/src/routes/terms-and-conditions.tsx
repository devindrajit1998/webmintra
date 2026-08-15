import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { ShieldCheck, ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/terms-and-conditions")({
  component: TermsAndConditionsPage,
  head: () => ({ meta: [{ title: "Terms and Conditions | WebMintra" }] }),
});

export function TermsAndConditionsPage() {
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
              <FileText className="h-3.5 w-3.5" /> Platform Terms
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Terms and Conditions</h1>
            <p className="text-xs text-slate-400 mt-2">
              Effective Date: August 2026 • Agreement for Software-as-a-Service Platform
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
              <p>
                By creating an account or accessing the {siteName} platform, you agree to comply
                with and be bound by these Terms and Conditions. If you do not agree to these terms,
                please do not use our services.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">
                2. Platform Subscription & Service Use
              </h2>
              <p>
                {siteName} provides website building software, cloud hosting, template libraries,
                form processing, and custom domain connection services. You agree to use the service
                only for lawful business operations and represent that you have the right to publish
                all content you upload.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Intellectual Property Rights</h2>
              <p>
                You retain all rights, title, and interest in your own text, business logos, product
                catalogs, and trademarked materials. {siteName} retains all rights to the underlying
                software engine, builder code, template architectures, and platform infrastructure.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. Prohibited Content</h2>
              <p>
                Users may not publish websites involving illegal goods, deceptive financial schemes,
                malware, spam, or copyright-infringing media.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">5. Service Availability & Uptime</h2>
              <p>
                We strive for 99.9% uptime on managed cloud infrastructure. Scheduled maintenance
                windows will be communicated via the platform announcements dashboard.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">6. Inquiries</h2>
              <p>
                Questions regarding platform terms can be directed to{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-cyan-400 underline font-semibold"
                >
                  {supportEmail}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
