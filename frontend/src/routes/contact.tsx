import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings, submitPublicContactForm } from "@/lib/public-api";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/contact")({
  loader: async () => {
    try {
      const settings = await getPublicSettings().catch(() => ({}));
      return { settings };
    } catch {
      return { settings: {} };
    }
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings || {};
    const siteName = String(settings["site.name"] || "WebMintra");
    const canonicalBase = String(settings["seo.canonicalUrl"] || "https://webmintra.in").replace(
      /\/$/,
      "",
    );
    const pageUrl = `${canonicalBase}/contact`;
    const title = `Contact Us & 24/7 Support | ${siteName}`;
    const description = `Get in touch with the ${siteName} team for sales enquiries, custom domains assistance, or technical website support.`;

    const jsonLdContact = {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: title,
      url: pageUrl,
      description,
      mainEntity: {
        "@type": "Organization",
        name: siteName,
        url: canonicalBase,
        ...(settings["brand.logoUrl"] ? { logo: settings["brand.logoUrl"] } : {}),
      },
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl },
        { property: "og:site_name", content: siteName },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLdContact),
        },
      ],
    };
  },
  component: PublicContactPage,
});

export function PublicContactPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Pre-Sales Enquiry",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const siteName = settings["site.name"] || "WebMintra";
  const supportEmail = settings["site.supportEmail"] || "support@webmintra.in";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in your name, email and message.");
      return;
    }

    try {
      setIsSubmitting(true);

      let recaptchaToken: string | null = null;
      const recaptchaSiteKey = settings["security.recaptchaSiteKey"];
      const recaptchaEnabled = settings["security.recaptchaEnabled"];
      if (recaptchaEnabled && recaptchaSiteKey) {
        const { executeRecaptcha } = await import("@/lib/recaptcha");
        recaptchaToken = await executeRecaptcha(recaptchaSiteKey, "contact");
      }

      const res = await submitPublicContactForm({
        ...formData,
        recaptchaToken: recaptchaToken || undefined,
      } as any);
      setIsSuccess(true);
      toast.success(res.message || "Message sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit enquiry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      {/* ── GLOBAL HEADER NAVIGATION ─────────────────────────────────── */}
      <PublicHeader />

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-5 sm:px-6 py-12 lg:py-16">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11.5px] font-bold text-[#c2410c] shadow-2xs">
            <span>🇮🇳</span>
            <span>DEDICATED SUPPORT FOR INDIAN BUSINESSES</span>
          </div>
          <h1 className="text-[34px] sm:text-[44px] font-extrabold text-[#0f172a] leading-tight">
            Get in touch with our team
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#475569] max-w-lg mx-auto">
            Have questions about creating your website, custom .in domains, or business plans? We
            are here to help.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr] max-w-6xl mx-auto items-start">
          {/* Left: Contact Info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-7 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-[#0f172a] border-b border-[#f1f5f9] pb-3">
                Contact Information
              </h3>

              <div className="space-y-5 text-sm">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] shadow-2xs">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0f172a]">WhatsApp Support</p>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Instant chat with our onboarding team
                    </p>
                    <a
                      href="https://wa.me/919876543210"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline mt-1.5"
                    >
                      💬 Chat on WhatsApp →
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] shadow-2xs">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0f172a]">Email Us</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{supportEmail}</p>
                    <p className="text-[11px] text-[#ea580c] mt-1 font-semibold">
                      Guaranteed response within 2 hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] shadow-2xs">
                    <MapPin className="h-5 w-5 text-[#059669]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0f172a]">Headquarters</p>
                    <p className="text-xs text-[#64748b] mt-0.5">Bengaluru & Kolkata, India</p>
                    <p className="text-[11px] text-[#94a3b8] mt-1">
                      Proudly supporting 28 States & UTs
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Message Form */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-8 shadow-sm">
            {isSuccess ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-[#0f172a]">Enquiry Received!</h3>
                <p className="mt-2 text-sm text-[#64748b] max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out. Our support and onboarding team has received your
                  message and will reply to{" "}
                  <span className="text-[#059669] font-bold">{formData.email}</span> shortly.
                </p>
                <button
                  onClick={() => {
                    setIsSuccess(false);
                    setFormData({
                      name: "",
                      email: "",
                      phone: "",
                      subject: "Pre-Sales Enquiry",
                      message: "",
                    });
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#047857]"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0f172a]">Send us a message</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Fill out the form below and we will get back to you promptly.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div>
                    <label className="text-xs font-bold text-[#0f172a] block mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-none shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#0f172a] block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. rahul@business.in"
                      className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-[#0f172a] block mb-1">
                      Phone / WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-none shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#0f172a] block mb-1">Subject</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-[#0f172a] focus:border-[#059669] focus:outline-none shadow-2xs"
                    >
                      <option value="Pre-Sales Enquiry">Pre-Sales / Business Plan Enquiry</option>
                      <option value="Custom Domain Setup">Custom .in Domain Setup</option>
                      <option value="Template Request">Request a New Template</option>
                      <option value="Billing & Invoicing">GST Invoicing & Billing</option>
                      <option value="Technical Support">Technical Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Message / How can we help? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your business or question..."
                    className="w-full resize-none rounded-xl border border-[#cbd5e1] bg-white p-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-none shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#059669] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    "Sending Message..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
