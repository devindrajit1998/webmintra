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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: PublicContactPage,
  head: () => ({ meta: [{ title: "Contact Us & Support | WebMintra" }] }),
});

export function PublicContactPage() {
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
  const supportEmail = settings["site.supportEmail"] || "support@webmintra.com";

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
    <div className="min-h-screen bg-[#07111f] text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#07111f]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-3 font-display text-lg font-bold text-white transition hover:opacity-80"
          >
            {settings["brand.logoUrl"] ? (
              <img src={settings["brand.logoUrl"]} alt="Logo" className="h-9 w-9 object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500 text-white">
                <span className="font-bold">{(settings["site.name"] || "W").charAt(0)}</span>
              </span>
            )}
            <span className="text-[22px] font-black tracking-tight leading-none bg-gradient-to-r from-[#0055ff] via-[#00c9a7] to-[#10e793] bg-clip-text text-transparent lowercase font-sans">
              {settings["site.name"] || "webmintra"}
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Home
            </Link>
            <Link
              to="/templates"
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Templates
            </Link>
            <Link
              to="/help"
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Help
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-md mb-4">
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" /> We&apos;re Here to Help
          </span>
          <h1 className="font-display text-4xl font-extrabold text-white sm:text-5xl tracking-tight">
            Get in touch with our team
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Have questions about creating your website, custom domains, or business plans? Reach out
            anytime.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] max-w-6xl mx-auto">
          {/* Left: Contact Info */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e1c2e] to-[#0a1523] p-8 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6">Contact Information</h3>

              <div className="space-y-6 text-sm">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Email Us</p>
                    <p className="text-slate-400 mt-0.5">{supportEmail}</p>
                    <p className="text-[11px] text-cyan-400 mt-1 font-medium">
                      Response within 2 hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">WhatsApp & Phone Support</p>
                    <p className="text-slate-400 mt-0.5">+91 (Support Helpline)</p>
                    <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                      Mon–Sat, 10 AM – 7 PM IST
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Headquarters</p>
                    <p className="text-slate-400 mt-0.5">Kolkata & Bengaluru, India</p>
                    <p className="text-[11px] text-slate-500 mt-1">Serving businesses nationwide</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/5 p-6 backdrop-blur-sm">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" /> 15-Day Free Trial
              </h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Ready to explore? You can create your website immediately without waiting for sales
                approval or entering credit card details.
              </p>
              <Link
                to="/create-account"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
              >
                Start Free Trial Now <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right: Message Form */}
          <div className="rounded-3xl border border-white/10 bg-[#0c1827] p-8 shadow-2xl">
            {isSuccess ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Enquiry Received!</h3>
                <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out. Our support and onboarding team has received your
                  message and will reply to{" "}
                  <span className="text-cyan-400 font-semibold">{formData.email}</span> shortly.
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
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xl font-bold text-white mb-2">Send us a message</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Fill out the form below and we will get back to you promptly.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. rahul@business.in"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Pre-Sales Enquiry">Pre-Sales / Business Plan Enquiry</option>
                      <option value="Custom Domain Setup">Custom Domain Setup Question</option>
                      <option value="Template Request">Request a New Template</option>
                      <option value="Billing & Invoicing">Billing & Invoicing</option>
                      <option value="Technical Support">Technical Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Message / How can we help? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your business or question..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 p-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400 disabled:opacity-50"
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
    </div>
  );
}
