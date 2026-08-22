import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { FileText } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

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
  const supportEmail = settings["site.supportEmail"] || "support@webmintra.in";
  const policyContent = settings["content.termsAndConditions"];

  return (
    <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      <PublicHeader />

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-5 sm:px-6 py-12 lg:py-16">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 sm:p-12 shadow-sm space-y-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11px] font-bold text-[#c2410c] shadow-2xs">
              <FileText className="h-3.5 w-3.5" /> Platform Terms
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a]">
              Terms and Conditions
            </h1>
            <p className="text-xs text-[#64748b] mt-2">
              Effective Date: August 2026 • Agreement for Software-as-a-Service Platform in India
            </p>
          </div>

          {typeof policyContent === "string" && policyContent.trim() ? (
            <article
              className="prose prose-slate max-w-none text-sm leading-relaxed text-[#475569] prose-headings:text-[#0f172a] prose-headings:font-bold prose-h2:text-base prose-a:font-bold prose-a:text-[#059669] prose-li:text-[#64748b]"
              dangerouslySetInnerHTML={{ __html: policyContent }}
            />
          ) : (
            <div className="space-y-6 text-sm text-[#475569] leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">1. Acceptance of Terms</h2>
                <p>
                  By creating an account or accessing the {siteName} platform, you agree to comply
                  with and be bound by these Terms and Conditions. If you do not agree to these
                  terms, please do not use our services.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">
                  2. Platform Subscription & Service Use
                </h2>
                <p>
                  {siteName} provides website building software, cloud edge hosting, template
                  libraries, WhatsApp form processing, and custom .in / .com domain connection
                  services. You agree to use the service only for lawful business operations and
                  represent that you have the right to publish all content you upload.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">
                  3. Intellectual Property Rights
                </h2>
                <p>
                  You retain all rights, title, and interest in your own text, business logos,
                  product catalogs, and trademarked materials. {siteName} retains all rights to the
                  underlying software engine, builder code, template architectures, and platform
                  infrastructure.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">4. Prohibited Content</h2>
                <p>
                  Users may not publish websites involving illegal goods, deceptive financial
                  schemes, malware, spam, or copyright-infringing media.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">
                  5. Service Availability & Uptime
                </h2>
                <p>
                  We strive for 99.9% uptime on managed cloud infrastructure hosted across Indian
                  edge nodes. Scheduled maintenance windows will be communicated via the platform
                  announcements dashboard.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">6. Inquiries</h2>
                <p>
                  Questions regarding platform terms can be directed to{" "}
                  <a href={`mailto:${supportEmail}`} className="text-[#059669] underline font-bold">
                    {supportEmail}
                  </a>
                  .
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
