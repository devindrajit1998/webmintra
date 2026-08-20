import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Phone, Search, Sparkles } from "lucide-react";
import {
  completeOnboarding,
  getTemplates,
  phoneVerificationRequest,
  type CatalogTemplate,
  verifyPhone,
} from "@/lib/auth-api";

export function TenantOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [business, setBusiness] = useState({
    name: "",
    logoUrl: "",
    address: "",
    email: "",
    phone: "",
    description: "",
  });
  const [plan, setPlan] = useState("starter");
  const [templates, setTemplates] = useState<CatalogTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getTemplates()
      .then((result) => setTemplates(result.templates))
      .catch((error) => setNotice(error.message));
  }, []);
  const categories = ["All", ...new Set(templates.map((template) => template.category))];
  const filtered = templates.filter(
    (template) =>
      (category === "All" || template.category === category) &&
      `${template.name} ${template.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  async function sendPhoneCode() {
    try {
      setBusy(true);
      setNotice("");
      await phoneVerificationRequest(phone);
      setStep(2);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to send code.");
    } finally {
      setBusy(false);
    }
  }
  async function confirmPhone() {
    try {
      setBusy(true);
      setNotice("");
      await verifyPhone(code);
      setStep(3);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to verify phone.");
    } finally {
      setBusy(false);
    }
  }
  async function chooseTemplate(templateId: string) {
    try {
      setBusy(true);
      setNotice("");
      await completeOnboarding(business, plan, templateId);
      await navigate({ to: "/tenant", replace: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create draft website.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen tiranga-hero-bg indian-jali-pattern px-5 py-8 text-[#0f172a] font-sans sm:py-12">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ea580c] to-[#059669] text-white shadow-xs font-bold text-base">
              W
            </div>
            <div>
              <p className="font-extrabold text-lg text-[#0f172a] leading-none lowercase">webmintra</p>
              <p className="text-xs text-[#64748b] font-medium mt-0.5">Set up your Indian business website</p>
            </div>
          </div>

          <span className="rounded-full bg-[#ecfdf5] border border-[#a7f3d0] px-3 py-1 text-[11px] font-bold text-[#059669] hidden sm:inline-flex items-center gap-1">
            <span>🇮🇳</span> Step {step} of 5
          </span>
        </div>

        {/* Stepper Progress Bar */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <span
              key={item}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                item < step
                  ? "bg-[#059669]"
                  : item === step
                    ? "bg-[#ea580c]"
                    : "bg-[#e2e8f0]"
              }`}
            />
          ))}
        </div>

        <section className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl sm:p-9">
          <div className="flex items-center justify-between">
            <span className="inline-block rounded-full bg-[#fff7ed] border border-[#fed7aa] px-3 py-0.5 text-[11px] font-bold text-[#c2410c]">
              STEP {step} OF 5
            </span>
          </div>

          {notice ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium text-amber-800">
              {notice}
            </p>
          ) : null}

          {step === 1 ? (
            <Step
              title="Verify your Indian mobile number"
              description="We use phone verification to protect your business workspace and route customer WhatsApp leads."
            >
              <label className="block text-xs font-bold text-[#0f172a]">
                Mobile number with +91 country code
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-2 h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
                />
              </label>
              <button
                disabled={busy}
                onClick={() => void sendPhoneCode()}
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-60 cursor-pointer"
              >
                <Phone className="h-4 w-4" />
                Send Verification Code
              </button>
            </Step>
          ) : null}

          {step === 2 ? (
            <Step
              title="Enter your 6-digit OTP code"
              description="SMS is simulated in development mode. Use test code 123456."
            >
              <label className="block text-xs font-bold text-[#0f172a]">
                Six-digit verification code
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="mt-2 h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f172a] tracking-[.4em] font-mono outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
                />
              </label>
              <button
                disabled={busy}
                onClick={() => void confirmPhone()}
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-60 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Verify Phone & Continue
              </button>
            </Step>
          ) : null}

          {step === 3 ? (
            <Step
              title="Tell us about your business"
              description="These details appear on your website header, WhatsApp lead alerts, and Google Maps card."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(business).map(([key, value]) => (
                  <label
                    className={`block text-xs font-bold text-[#0f172a] ${key === "description" || key === "address" ? "sm:col-span-2" : ""}`}
                    key={key}
                  >
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}
                    <input
                      value={value}
                      onChange={(event) =>
                        setBusiness((current) => ({ ...current, [key]: event.target.value }))
                      }
                      placeholder={
                        key === "name"
                          ? "e.g. Sharma Dental Clinic"
                          : key === "address"
                            ? "e.g. Greater Kailash 1, New Delhi"
                            : ""
                      }
                      className="mt-1.5 h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
                    />
                  </label>
                ))}
              </div>
              <button
                disabled={busy || !business.name}
                onClick={() => setStep(4)}
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-60 cursor-pointer"
              >
                Continue to Plan <ChevronRight className="h-4 w-4" />
              </button>
            </Step>
          ) : null}

          {step === 4 ? (
            <Step
              title="Choose your business plan"
              description="Includes a 14-day free trial. No credit card required to start."
            >
              <div className="grid gap-3.5 sm:grid-cols-3">
                {[
                  { id: "starter", name: "Starter", desc: "1 website · Free .in domain · WhatsApp Leads" },
                  { id: "growth", name: "Growth", desc: "3 websites · Priority Edge · GST Invoicing" },
                  { id: "pro", name: "Business Pro", desc: "10 websites · 50 GB storage · VIP Support" },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setPlan(option.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      plan === option.id
                        ? "border-[#059669] bg-[#ecfdf5] shadow-xs"
                        : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-base font-extrabold text-[#0f172a]">{option.name}</p>
                      {plan === option.id && <span className="text-[#059669] text-xs font-bold">✓ Selected</span>}
                    </div>
                    <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                      {option.desc}
                    </p>
                  </button>
                ))}
              </div>
              <button
                disabled={busy}
                onClick={() => setStep(5)}
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#047857] cursor-pointer"
              >
                Continue to Templates <ChevronRight className="h-4 w-4" />
              </button>
            </Step>
          ) : null}

          {step === 5 ? (
            <Step
              title="Choose your starter template"
              description="Pick a professionally crafted Indian business template. Your site will be ready to customize immediately."
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-[#94a3b8]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search templates (e.g. dental, gym, restaurant)..."
                    className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white pl-9 pr-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                  />
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669]"
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((template) => (
                  <article
                    className="landing-template-card flex flex-col justify-between p-4"
                    key={template.id}
                  >
                    <div>
                      <div className="h-24 rounded-xl bg-gradient-to-br from-[#ea580c]/15 via-white to-[#059669]/15 border border-[#e2e8f0] flex items-center justify-center">
                        <span className="text-2xl">🇮🇳</span>
                      </div>
                      <p className="mt-3 text-sm font-extrabold text-[#0f172a]">{template.name}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-[#059669] uppercase">{template.category}</p>
                      <p className="mt-1.5 text-xs text-[#64748b] line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => void chooseTemplate(template.id)}
                      className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#059669] px-3 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] cursor-pointer"
                    >
                      Use Template <Sparkles className="h-3.5 w-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            </Step>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function Step({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">{title}</h1>
      <p className="mt-2 max-w-2xl text-xs sm:text-sm text-[#64748b] leading-relaxed">{description}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}
