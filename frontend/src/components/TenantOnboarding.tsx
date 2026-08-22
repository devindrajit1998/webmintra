import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  Phone,
  Search,
  Sparkles,
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import {
  completeOnboarding,
  getTemplates,
  phoneVerificationRequest,
  type CatalogTemplate,
  verifyPhone,
  uploadTenantBrandAsset,
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const logoUrl = settings["brand.logoUrl"] || "";
  const siteName = settings["brand.siteName"] || "webmintra";

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

  async function handleLogoUpload(file: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2MB.");
      return;
    }
    try {
      setUploadingLogo(true);
      const res = await uploadTenantBrandAsset(file, "logo");
      setBusiness((prev) => ({ ...prev, logoUrl: res.url }));
      toast.success("Business logo uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload business logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

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
            <BrandLogo logoUrl={logoUrl} siteName={siteName} size="md" />
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
                item < step ? "bg-[#059669]" : item === step ? "bg-[#ea580c]" : "bg-[#e2e8f0]"
              }`}
            />
          ))}
        </div>

        <section className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl sm:p-9">
          <div className="flex items-center justify-between">
            <span className="inline-block rounded-full bg-[#fff7ed] border border-[#fed7aa] px-3 py-0.5 text-[11px] font-bold text-[#c2410c]">
              STEP {step} OF 5
            </span>
            {notice ? <p className="text-xs font-bold text-rose-600">{notice}</p> : null}
          </div>

          {step === 1 ? (
            <Step
              title="Verify your WhatsApp or mobile number"
              description="Get lead submissions, payment updates, and domain alerts instantly."
            >
              <label className="block text-xs font-bold text-[#0f172a]">
                Mobile number
                <input
                  type="tel"
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
                {/* Business Name */}
                <label className="block text-xs font-bold text-[#0f172a]">
                  Business Name *
                  <input
                    required
                    value={business.name}
                    onChange={(e) => setBusiness((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Aura Dental Clinic"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 shadow-2xs"
                  />
                </label>

                {/* Business Logo Upload */}
                <div className="block text-xs font-bold text-[#0f172a]">
                  <span className="block mb-1.5">Business Logo</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                  {business.logoUrl ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-2">
                      <img
                        src={business.logoUrl}
                        alt="Business Logo Preview"
                        className="h-9 w-9 rounded-lg object-contain bg-white border border-[#e2e8f0]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#065f46] truncate">Logo Uploaded</p>
                        <p className="text-[10px] text-[#059669] truncate">
                          Ready for your website header
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="rounded-lg border border-[#a7f3d0] bg-white px-2.5 py-1 text-[11px] font-bold text-[#065f46] hover:bg-[#d1fae5] transition"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setBusiness((prev) => ({ ...prev, logoUrl: "" }))}
                        className="rounded-lg p-1 text-[#065f46] hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-3 text-xs font-semibold text-[#64748b] hover:border-[#059669] hover:bg-[#ecfdf5]/40 hover:text-[#059669] cursor-pointer transition shadow-2xs"
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#059669]" />
                          <span>Uploading logo...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4 text-[#059669]" />
                          <span>Upload Logo (PNG, JPG, WebP)</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Address */}
                <label className="block text-xs font-bold text-[#0f172a] sm:col-span-2">
                  Address / City
                  <input
                    value={business.address}
                    onChange={(e) => setBusiness((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g. Greater Kailash 1, New Delhi"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 shadow-2xs"
                  />
                </label>

                {/* Email */}
                <label className="block text-xs font-bold text-[#0f172a]">
                  Business Email
                  <input
                    type="email"
                    value={business.email}
                    onChange={(e) => setBusiness((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@auradental.in"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 shadow-2xs"
                  />
                </label>

                {/* Phone */}
                <label className="block text-xs font-bold text-[#0f172a]">
                  Phone (WhatsApp)
                  <input
                    type="tel"
                    value={business.phone}
                    onChange={(e) => setBusiness((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 shadow-2xs"
                  />
                </label>

                {/* Description */}
                <label className="block text-xs font-bold text-[#0f172a] sm:col-span-2">
                  Description / Tagline
                  <textarea
                    rows={2}
                    value={business.description}
                    onChange={(e) =>
                      setBusiness((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Brief description of your business or services..."
                    className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-white p-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 shadow-2xs resize-none"
                  />
                </label>
              </div>
              <button
                disabled={busy || !business.name || uploadingLogo}
                onClick={() => setStep(4)}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#059669] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#047857] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
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
                  {
                    id: "starter",
                    name: "Starter",
                    desc: "1 website · Free .in domain · WhatsApp Leads",
                  },
                  {
                    id: "growth",
                    name: "Growth",
                    desc: "3 websites · Priority Edge · GST Invoicing",
                  },
                  {
                    id: "pro",
                    name: "Business Pro",
                    desc: "10 websites · 50 GB storage · VIP Support",
                  },
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
                      {plan === option.id && (
                        <span className="text-[#059669] text-xs font-bold">✓ Selected</span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-[#64748b] leading-relaxed">{option.desc}</p>
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
                      <p className="mt-0.5 text-[10px] font-bold text-[#059669] uppercase">
                        {template.category}
                      </p>
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
      <p className="mt-2 max-w-2xl text-xs sm:text-sm text-[#64748b] leading-relaxed">
        {description}
      </p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}
