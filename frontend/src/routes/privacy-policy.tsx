import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { Lock } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  head: () => ({ meta: [{ title: "Privacy Policy | WebMintra" }] }),
});

function PrivacyPolicyPage() {
  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const siteName = settings["site.name"] || "WebMintra";
  const supportEmail = settings["site.supportEmail"] || "support@webmintra.in";
  const policyContent = settings["content.privacyPolicy"];

  return (
    <div className="landing-page min-h-screen flex flex-col justify-between tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      <PublicHeader />

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="flex-1 w-full mx-auto max-w-7xl px-5 sm:px-6 py-10 lg:py-14 space-y-8">
        {/* Banner Header */}
        <div className="content-page-header px-6 py-6 sm:px-8 sm:py-7">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ea580c] tracking-tight">
            Privacy Policy
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
                <h2 className="text-base font-bold text-[#0f172a]">1. Overview</h2>
                <p>
                  {siteName} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;platform&rdquo;) values
                  your privacy and is committed to protecting the personal data of our users,
                  website owners, and their visitors. This Privacy Policy describes how we collect,
                  use, and share your information when you use our SaaS website building and hosting
                  services.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">2. Information We Collect</h2>
                <p>
                  We collect information necessary to provide and secure our services, including:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#64748b]">
                  <li>
                    <strong className="text-[#0f172a]">Account Data:</strong> Name, business name,
                    email address, phone number, and password credentials.
                  </li>
                  <li>
                    <strong className="text-[#0f172a]">Website Content:</strong> Text, images,
                    logos, business hours, and pricing lists uploaded to your created sites.
                  </li>
                  <li>
                    <strong className="text-[#0f172a]">Lead & Form Submissions:</strong> Enquiries
                    submitted by visitors on your published websites are stored securely for your
                    access and routed to WhatsApp.
                  </li>
                  <li>
                    <strong className="text-[#0f172a]">Billing Data:</strong> Transaction references
                    and subscription IDs processed through RBI-approved Indian payment gateways
                    (e.g. Razorpay, UPI). We never store raw card numbers.
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
                    Notify you immediately when prospective customers submit contact and booking
                    requests.
                  </li>
                  <li>
                    Provide customer support, GST invoices, onboarding assistance, and service
                    updates.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">4. Data Ownership & Security</h2>
                <p>
                  You retain 100% ownership of your business content, images, and visitor lead
                  submissions. All data in transit is encrypted using 256-bit SSL/TLS encryption and
                  stored on secure Indian cloud infrastructure.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0f172a]">5. Contact Information</h2>
                <p>
                  For questions regarding this policy or data deletion requests, email our data
                  protection officer at{" "}
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
