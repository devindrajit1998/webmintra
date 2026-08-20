import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  head: () => ({ meta: [{ title: "Privacy Policy | WebMintra" }] }),
});

export function PrivacyPolicyPage() {
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
              <Lock className="h-3.5 w-3.5" /> Legal Documentation
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a]">Privacy Policy</h1>
            <p className="text-xs text-[#64748b] mt-2">
              Last Updated: August 2026 • Compliant with Indian IT Act, 2000 & Digital Personal Data Protection (DPDP) Act
            </p>
          </div>

          <div className="space-y-6 text-sm text-[#475569] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">1. Overview</h2>
              <p>
                {siteName} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;platform&rdquo;) values
                your privacy and is committed to protecting the personal data of our users, website
                owners, and their visitors. This Privacy Policy describes how we collect, use, and
                share your information when you use our SaaS website building and hosting services.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">2. Information We Collect</h2>
              <p>We collect information necessary to provide and secure our services, including:</p>
              <ul className="list-disc pl-5 space-y-1 text-[#64748b]">
                <li>
                  <strong className="text-[#0f172a]">Account Data:</strong> Name, business name,
                  email address, phone number, and password credentials.
                </li>
                <li>
                  <strong className="text-[#0f172a]">Website Content:</strong> Text, images, logos,
                  business hours, and pricing lists uploaded to your created sites.
                </li>
                <li>
                  <strong className="text-[#0f172a]">Lead & Form Submissions:</strong> Enquiries
                  submitted by visitors on your published websites are stored securely for your access and routed to WhatsApp.
                </li>
                <li>
                  <strong className="text-[#0f172a]">Billing Data:</strong> Transaction references
                  and subscription IDs processed through RBI-approved Indian payment gateways (e.g. Razorpay, UPI). We never store raw card numbers.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">3. How We Use Your Data</h2>
              <p>Your information is used exclusively to:</p>
              <ul className="list-disc pl-5 space-y-1 text-[#64748b]">
                <li>
                  Host and deliver high-speed, secure websites with automatic SSL certification.
                </li>
                <li>
                  Notify you immediately when prospective customers submit contact and booking requests.
                </li>
                <li>Provide customer support, GST invoices, onboarding assistance, and service updates.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">4. Data Ownership & Security</h2>
              <p>
                You retain 100% ownership of your business content, images, and visitor lead submissions. All data in transit is encrypted using 256-bit SSL/TLS encryption and stored on secure Indian cloud infrastructure.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#0f172a]">5. Contact Information</h2>
              <p>
                For questions regarding this policy or data deletion requests, email our data protection officer at{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-[#059669] underline font-bold"
                >
                  {supportEmail}
                </a>
                .
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
