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
              <Lock className="h-3.5 w-3.5" /> Legal Documentation
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Privacy Policy</h1>
            <p className="text-xs text-slate-400 mt-2">
              Last Updated: August 2026 • Compliant with Indian IT Act, 2000 & Digital Personal Data
              Protection Act
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Overview</h2>
              <p>
                {siteName} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;platform&rdquo;) values
                your privacy and is committed to protecting the personal data of our users, website
                owners, and their visitors. This Privacy Policy describes how we collect, use, and
                share your information when you use our SaaS website building and hosting services.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Information We Collect</h2>
              <p>We collect information necessary to provide and secure our services, including:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>
                  <strong className="text-slate-200">Account Data:</strong> Name, business name,
                  email address, phone number, and password credentials.
                </li>
                <li>
                  <strong className="text-slate-200">Website Content:</strong> Text, images, logos,
                  business hours, and pricing lists uploaded to your created sites.
                </li>
                <li>
                  <strong className="text-slate-200">Lead & Form Submissions:</strong> Enquiries
                  submitted by visitors on your published websites are stored securely for your
                  access.
                </li>
                <li>
                  <strong className="text-slate-200">Billing Data:</strong> Transaction references
                  and subscription IDs processed through secure payment gateway partners (e.g.
                  Razorpay). We never store raw credit card numbers.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. How We Use Your Data</h2>
              <p>Your information is used exclusively to:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>
                  Host and deliver high-speed, secure websites with automatic SSL certification.
                </li>
                <li>
                  Notify you immediately when prospective customers submit contact and booking
                  requests.
                </li>
                <li>Provide customer support, onboarding assistance, and service updates.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. Data Ownership & Security</h2>
              <p>
                You retain 100% ownership of your business content, images, and visitor lead
                submissions. All data in transit is encrypted using 256-bit SSL/TLS encryption.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">5. Contact Information</h2>
              <p>
                For questions regarding this policy or data deletion requests, email our data
                protection team at{" "}
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
