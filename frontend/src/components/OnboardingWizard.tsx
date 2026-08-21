import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Zap,
  Eye,
  X,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { BrandLogo } from "./BrandLogo";
import {
  getOnboardingPlans,
  getOnboardingTemplates,
  getOnboardingTemplate,
  createRazorpayOrder,
  verifyOnboardingPayment,
  saveSessionUser,
  routeForRole,
  getAuthenticatedUser,
  type OnboardingPlan,
  type OnboardingTemplate,
  type OnboardingTemplateDetails,
  type BusinessInfo,
} from "@/lib/auth-api";

declare const Razorpay: any;

const STEPS = ["Business Details", "Choose Plan", "Choose Template", "Payment"] as const;
type Step = 0 | 1 | 2 | 3;

const EMPTY_BUSINESS: BusinessInfo = {
  name: "",
  logoUrl: "",
  address: "",
  email: "",
  phone: "",
  description: "",
};

// ── Helper: load Razorpay checkout script ─────────────────────
function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof Razorpay !== "undefined") {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Main Component ────────────────────────────────────────────
export function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [business, setBusiness] = useState<BusinessInfo>(EMPTY_BUSINESS);
  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<OnboardingPlan | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<OnboardingTemplate | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Load plans when reaching step 1
  useEffect(() => {
    if (step !== 1) return;
    setLoadingPlans(true);
    getOnboardingPlans()
      .then(({ plans }) => setPlans(plans))
      .catch((err) => toast.error(err.message || "Failed to load plans"))
      .finally(() => setLoadingPlans(false));
  }, [step]);

  // Load templates when reaching step 2
  useEffect(() => {
    if (step !== 2 || !selectedPlan) return;
    setLoadingTemplates(true);
    setSelectedTemplate(null);
    getOnboardingTemplates(selectedPlan.id, selectedCategory || undefined)
      .then(({ templates, categories }) => {
        setTemplates(templates);
        setCategories(categories);
      })
      .catch((err) => toast.error(err.message || "Failed to load templates"))
      .finally(() => setLoadingTemplates(false));
  }, [step, selectedPlan, selectedCategory]);

  // ── Navigation ──────────────────────────────────────────────
  function nextStep() {
    if (step === 0 && !business.name.trim()) {
      toast.error("Business name is required.");
      return;
    }
    if (step === 1 && !selectedPlan) {
      toast.error("Please choose a plan.");
      return;
    }
    if (step === 2 && !selectedTemplate) {
      toast.error("Please choose a template.");
      return;
    }
    setStep((s) => (s + 1) as Step);
  }

  function prevStep() {
    if (step > 0) setStep((s) => (s - 1) as Step);
  }

  // ── Payment ─────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!selectedPlan || !selectedTemplate) return;
    setIsPaying(true);
    try {
      const order = await createRazorpayOrder(selectedPlan.id, interval);

      if (order.free) {
        // Free plan → skip Razorpay
        const result = await verifyOnboardingPayment({
          planId: selectedPlan.id,
          templateId: selectedTemplate.id,
          interval,
          business,
        });
        toast.success(result.message || "Onboarding complete!");
        const user = await getAuthenticatedUser(true);
        if (user) {
          saveSessionUser({ ...user, onboardingCompleted: true });
        }
        await navigate({ to: routeForRole("tenant"), replace: true });
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load payment gateway. Try again.");
        return;
      }

      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) {
        toast.error("Razorpay key is not configured.");
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new Razorpay({
          key: keyId,
          order_id: order.razorpayOrderId,
          amount: (order.amount || 0) * 100,
          currency: order.currency || "INR",
          name: "WebMintra",
          description: `${selectedPlan.name} – ${interval}`,
          prefill: {
            name: business.name,
            email: business.email || "",
            contact: business.phone || "",
          },
          theme: { color: "#06b6d4" },
          handler: async (razorpayResponse: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const result = await verifyOnboardingPayment({
                planId: selectedPlan.id,
                templateId: selectedTemplate.id,
                interval,
                business,
                razorpayOrderId: razorpayResponse.razorpay_order_id,
                razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                razorpaySignature: razorpayResponse.razorpay_signature,
              });
              toast.success(result.message || "Payment successful! Onboarding complete.");
              const user = await getAuthenticatedUser(true);
              if (user) saveSessionUser({ ...user, onboardingCompleted: true });
              await navigate({ to: routeForRole("tenant"), replace: true });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
        });
        rzp.open();
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setIsPaying(false);
    }
  }, [selectedPlan, selectedTemplate, interval, business, navigate]);

  const { data: settings = {} } = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const logoUrl = settings["brand.logoUrl"] || "";
  const siteName = settings["brand.siteName"] || "webmintra";

  return (
    <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern font-sans text-[#0f172a] flex flex-col lg:flex-row">
      {/* Left Sidebar (Progress) */}
      <div className="flex w-full flex-col border-b border-[#e2e8f0] bg-white/90 backdrop-blur-md lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r lg:border-[#e2e8f0] xl:w-[360px] shadow-sm">
        {/* Branding */}
        <div className="flex items-center gap-3 p-6 lg:p-8 border-b border-[#f1f5f9]">
          <BrandLogo logoUrl={logoUrl} siteName={siteName} size="md" />
        </div>

        {/* Steps Tracker */}
        <div className="flex flex-row overflow-x-auto p-6 lg:flex-col lg:overflow-visible lg:p-8 scrollbar-none">
          {STEPS.map((label, i) => {
            const isCompleted = i < step;
            const isCurrent = i === step;
            return (
              <div
                key={label}
                className="relative flex flex-row items-center lg:mb-7 lg:flex-col lg:items-start last:mb-0"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isCompleted
                        ? "bg-[#059669] text-white shadow-emerald-500/20"
                        : isCurrent
                          ? "border-2 border-[#ea580c] bg-[#fff7ed] text-[#ea580c] shadow-orange-500/20"
                          : "border border-[#cbd5e1] bg-white text-[#94a3b8]"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : i + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                      Step {i + 1}
                    </span>
                    <span
                      className={`whitespace-nowrap text-xs font-bold transition-colors ${
                        isCurrent
                          ? "text-[#0f172a]"
                          : isCompleted
                            ? "text-[#059669]"
                            : "text-[#64748b]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>

                {/* Connector Line */}
                {i < STEPS.length - 1 && (
                  <div
                    className={`
                      mx-3 h-0.5 w-6 lg:absolute lg:left-4.5 lg:top-9 lg:mx-0 lg:-ml-px lg:h-[calc(100%+0.75rem)] lg:w-0.5 
                      transition-colors ${isCompleted ? "bg-[#059669]" : "bg-[#e2e8f0]"}
                   `}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Sub-card: Bharat Trust Badge */}
        <div className="mt-auto hidden lg:block p-6">
          <div className="rounded-2xl border border-[#fed7aa] bg-[#fffaf5] p-4 shadow-2xs">
            <p className="text-xs font-bold text-[#ea580c] flex items-center gap-1.5">
              <span>🇮🇳</span> <span>Made for Indian Businesses</span>
            </p>
            <p className="text-[11px] text-[#64748b] mt-1 leading-relaxed">
              100% Data Stored in India. Instant WhatsApp enquiries and UPI/Razorpay integration ready.
            </p>
          </div>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:py-14 mx-auto">
          {step === 0 && <BusinessStep business={business} onChange={setBusiness} />}
          {step === 1 && (
            <PlanStep
              plans={plans}
              loading={loadingPlans}
              selected={selectedPlan}
              interval={interval}
              onSelect={setSelectedPlan}
              onIntervalChange={setInterval}
            />
          )}
          {step === 2 && selectedPlan && (
            <TemplateStep
              templates={templates}
              categories={categories}
              selectedCategory={selectedCategory}
              loading={loadingTemplates}
              selected={selectedTemplate}
              onSelect={setSelectedTemplate}
              onCategoryChange={setSelectedCategory}
              onPreview={setPreviewTemplate}
            />
          )}
          {step === 3 && selectedPlan && selectedTemplate && (
            <PaymentStep
              plan={selectedPlan}
              template={selectedTemplate}
              business={business}
              interval={interval}
              onPay={handlePay}
              isPaying={isPaying}
            />
          )}

          {/* Bottom Action Nav Bar */}
          <div className="mt-10 flex items-center justify-between border-t border-[#e2e8f0] pt-6">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-5 py-2.5 text-xs font-bold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-7 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] active:scale-[0.98]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying}
                className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-7 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] active:scale-[0.98] disabled:opacity-50"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> Confirm & Launch Workspace
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={(t) => {
            setSelectedTemplate(t);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// ── Step 1: Business Details ──────────────────────────────────
function BusinessStep({
  business,
  onChange,
}: {
  business: BusinessInfo;
  onChange: (b: BusinessInfo) => void;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set =
    (field: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...business, [field]: e.target.value });

  async function handleLogoUpload(file: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2MB.");
      return;
    }
    try {
      setUploadingLogo(true);
      const res = await uploadTenantBrandAsset(file, "logo");
      onChange({ ...business, logoUrl: res.url });
      toast.success("Business logo uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload business logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#ea580c] shadow-2xs">
        <Sparkles className="h-3.5 w-3.5" /> Step 1 of 4: Business Details
      </span>
      <h1 className="mt-3 font-display text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
        Tell us about your business
      </h1>
      <p className="mt-1.5 text-xs sm:text-sm text-[#64748b] leading-relaxed">
        This information will appear automatically on your website's header, contact section, and enquiry forms.
      </p>

      <div className="mt-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-8 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business name *" icon={<Building2 className="h-4 w-4" />}>
            <input
              value={business.name}
              onChange={set("name")}
              placeholder="e.g. Sharma Dental Clinic"
              maxLength={120}
              required
              className={inputCls}
            />
          </Field>

          {/* Logo Upload Field */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#0f172a]">
              <span>Business Logo</span>
              <span className="text-[11px] font-normal text-[#64748b]">Optional</span>
            </label>
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
              <div className="flex h-11 items-center gap-3 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] px-3">
                <img
                  src={business.logoUrl}
                  alt="Business Logo Preview"
                  className="h-8 w-8 rounded-lg object-contain bg-white border border-[#cbd5e1]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#065f46] truncate">Logo Uploaded</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="rounded-lg border border-[#a7f3d0] bg-white px-2 py-1 text-[11px] font-bold text-[#065f46] hover:bg-[#d1fae5] transition"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...business, logoUrl: "" })}
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

          <Field label="Business email" icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              value={business.email}
              onChange={set("email")}
              placeholder="contact@mybusiness.in"
              maxLength={254}
              className={inputCls}
            />
          </Field>
          <Field label="Phone number (WhatsApp Ready)" icon={<Phone className="h-4 w-4" />}>
            <input
              type="tel"
              value={business.phone}
              onChange={set("phone")}
              placeholder="+91 98765 43210"
              maxLength={20}
              className={inputCls}
            />
          </Field>
          <Field label="Location / City / Address" icon={<MapPin className="h-4 w-4" />}>
            <input
              value={business.address}
              onChange={set("address")}
              placeholder="Connaught Place, New Delhi"
              maxLength={300}
              className={inputCls}
            />
          </Field>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-[#0f172a]">
              Brief description / Tagline
            </label>
            <textarea
              value={business.description}
              onChange={set("description")}
              placeholder="Briefly describe what your business offers (e.g. Best dental implants and root canal specialists in Delhi since 2012)..."
              maxLength={500}
              rows={3}
              className={`${inputCls} h-auto py-3 leading-relaxed`}
            />
            <p className="mt-1 text-right text-[11px] font-mono text-[#94a3b8]">
              {business.description.length}/500
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Plan Selection ────────────────────────────────────
function PlanStep({
  plans,
  loading,
  selected,
  interval,
  onSelect,
  onIntervalChange,
}: {
  plans: OnboardingPlan[];
  loading: boolean;
  selected: OnboardingPlan | null;
  interval: "monthly" | "yearly";
  onSelect: (p: OnboardingPlan) => void;
  onIntervalChange: (i: "monthly" | "yearly") => void;
}) {
  return (
    <div className="w-full">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#ea580c] shadow-2xs">
        <Sparkles className="h-3.5 w-3.5" /> Step 2 of 4: Select Plan
      </span>
      <h1 className="mt-3 font-display text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
        Choose your platform plan
      </h1>
      <p className="mt-1.5 text-xs sm:text-sm text-[#64748b] leading-relaxed">
        All plans come with a 14-day free trial. Upgrade, downgrade, or cancel at any time.
      </p>

      {/* Billing toggle */}
      <div className="mt-6 inline-flex items-center gap-1 rounded-xl border border-[#cbd5e1] bg-white p-1 shadow-2xs">
        {(["monthly", "yearly"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onIntervalChange(opt)}
            className={`rounded-lg px-5 py-2 text-xs font-bold transition ${
              interval === opt
                ? "bg-[#059669] text-white shadow-xs"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            {opt === "monthly" ? "Monthly Billing" : "Yearly (Save ~20% 🇮🇳)"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const price = interval === "yearly" ? plan.pricing.yearly : plan.pricing.monthly;
            const isSelected = selected?.id === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelect(plan)}
                className={`group relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-200 shadow-sm ${
                  isSelected
                    ? "border-[#059669] bg-[#ecfdf5]/50 ring-2 ring-[#059669]/30 -translate-y-1 shadow-md"
                    : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:-translate-y-0.5"
                }`}
              >
                {isSelected && (
                  <div className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-[#059669] text-white shadow-xs">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                )}
                <h3 className="font-display text-lg font-bold text-[#0f172a]">{plan.name}</h3>
                <p className="mt-1 text-xs text-[#64748b] line-clamp-2">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-black text-[#0f172a]">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  <span className="ml-1 text-xs font-semibold text-[#64748b]">
                    /{interval === "yearly" ? "yr" : "mo"}
                  </span>
                </div>
                {plan.trialDays > 0 && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                    ✓ {plan.trialDays}-day free trial included
                  </span>
                )}
                <div className="mt-5 flex-1 border-t border-[#f1f5f9] pt-4">
                  <ul className="space-y-2.5 text-xs">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-[#334155]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]" />
                        <span>{h}</span>
                      </li>
                    ))}
                    {plan.limits.pagesPerWebsite > 0 && (
                      <li className="flex items-start gap-2 text-[#334155]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]" />
                        <span>Up to {plan.limits.pagesPerWebsite} pages</span>
                      </li>
                    )}
                    {plan.limits.websites > 1 && (
                      <li className="flex items-start gap-2 text-[#334155]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]" />
                        <span>{plan.limits.websites} Websites</span>
                      </li>
                    )}
                    {plan.limits.customDomains > 0 && (
                      <li className="flex items-start gap-2 text-[#334155]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]" />
                        <span>{plan.limits.customDomains} Custom Domains</span>
                      </li>
                    )}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Template Selection ────────────────────────────────
function TemplateStep({
  templates,
  categories,
  selectedCategory,
  loading,
  selected,
  onSelect,
  onCategoryChange,
  onPreview,
}: {
  templates: OnboardingTemplate[];
  categories: string[];
  selectedCategory: string;
  loading: boolean;
  selected: OnboardingTemplate | null;
  onSelect: (t: OnboardingTemplate) => void;
  onCategoryChange: (c: string) => void;
  onPreview: (t: OnboardingTemplate) => void;
}) {
  return (
    <div className="w-full">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#ea580c] shadow-2xs">
        <Sparkles className="h-3.5 w-3.5" /> Step 3 of 4: Choose Template
      </span>
      <h1 className="mt-3 font-display text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
        Pick your starting design
      </h1>
      <p className="mt-1.5 text-xs sm:text-sm text-[#64748b] leading-relaxed">
        Select a template layout optimized for your business sector. You can customize all text and images later.
      </p>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCategoryChange("")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition shadow-2xs ${
              !selectedCategory
                ? "bg-[#059669] text-white shadow-xs"
                : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition shadow-2xs ${
                selectedCategory === cat
                  ? "bg-[#059669] text-white shadow-xs"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[#e2e8f0] bg-white p-12 text-center">
          <p className="text-xs font-semibold text-[#64748b]">
            No templates found matching this category.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => {
            const isSelected = selected?.id === t.id;
            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(t)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(t)}
                className={`group relative flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-200 shadow-sm cursor-pointer ${
                  isSelected
                    ? "border-[#059669] ring-2 ring-[#059669]/30 -translate-y-1 shadow-md"
                    : "border-[#e2e8f0] hover:border-[#cbd5e1] hover:-translate-y-0.5"
                }`}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3 z-30 grid h-6 w-6 place-items-center rounded-full bg-[#059669] text-white shadow-xs">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                )}
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  {t.thumbnailUrl ? (
                    <img
                      src={t.thumbnailUrl}
                      alt={t.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <AutoThumbnail templateId={t.id} title={t.title} />
                  )}
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b192c]/50 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(t);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0f172a] shadow-md hover:bg-[#f8fafc]"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#ea580c]" /> Live Preview
                    </button>
                  </div>
                  <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                    <span className="rounded-md border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                      {t.category}
                    </span>
                    <span className="rounded-md border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                      {t.pageCount} page{t.pageCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="p-4 border-t border-[#f1f5f9]">
                  <p className="text-sm font-bold text-[#0f172a]">{t.title}</p>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-[#64748b]">{t.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Step 4: Payment Summary ───────────────────────────────────
function PaymentStep({
  plan,
  template,
  business,
  interval,
  onPay,
  isPaying,
}: {
  plan: OnboardingPlan;
  template: OnboardingTemplate;
  business: BusinessInfo;
  interval: "monthly" | "yearly";
  onPay: () => void;
  isPaying: boolean;
}) {
  const price = interval === "yearly" ? plan.pricing.yearly : plan.pricing.monthly;
  const hasTrial = (plan.trialDays ?? 0) > 0;
  const isFree = price === 0 || hasTrial;

  return (
    <div className="w-full max-w-2xl">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#ea580c] shadow-2xs">
        <Sparkles className="h-3.5 w-3.5" /> Step 4 of 4: Setup & Launch
      </span>
      <h1 className="mt-3 font-display text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
        {hasTrial ? "Start Your 14-Day Free Trial" : isFree ? "Confirm & Launch" : "Review & Subscribe"}
      </h1>
      <p className="mt-1.5 text-xs sm:text-sm text-[#64748b] leading-relaxed">
        {hasTrial
          ? `Enjoy ${plan.trialDays} days of full unrestricted access. No credit card or upfront payment needed.`
          : isFree
            ? "You're on a free plan. Click confirm to start building."
            : "Review your order before completing payment."}
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        <div className="p-6 sm:p-8 space-y-4">
          <SummaryRow label="Business Name" value={business.name || "—"} />
          <SummaryRow label="Chosen Plan" value={`${plan.name} (${interval})`} />
          <SummaryRow label="Website Template" value={template.title} />
          <SummaryRow
            label="Access Mode"
            value={hasTrial ? `${plan.trialDays}-Day Free Trial` : "Active Subscription"}
            bold
          />
        </div>

        <div className="bg-[#f8fafc] border-t border-[#e2e8f0] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#475569]">Due Today</span>
            <span className="text-2xl sm:text-3xl font-black text-[#059669]">
              {hasTrial ? "₹0 (Free Trial)" : isFree ? "Free" : `₹${price.toLocaleString("en-IN")}`}
              {!isFree && !hasTrial && (
                <span className="text-xs font-normal text-[#64748b] ml-1">
                  / {interval === "yearly" ? "year" : "month"}
                </span>
              )}
            </span>
          </div>

          {hasTrial && (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] p-4 text-xs font-medium text-[#047857]">
              <Sparkles className="h-4 w-4 shrink-0 text-[#059669] mt-0.5" />
              <div>
                <p className="font-bold text-[#065f46]">Instant Access • No Card Required 🇮🇳</p>
                <p className="text-[11px] text-[#047857] mt-0.5 leading-relaxed">
                  Your website workspace will be ready immediately. You can edit content, test
                  layouts, and connect your domain during your {plan.trialDays}-day trial.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── UI Helpers ────────────────────────────────────────────────
const inputCls =
  "h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-xs font-semibold text-[#0f172a] shadow-xs outline-none transition placeholder:text-[#94a3b8] focus:border-[#059669] focus:ring-3 focus:ring-[#059669]/15";

function Field({
  label,
  icon,
  className,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-bold text-[#0f172a]">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
          {icon}
        </div>
        <div className="[&>input]:pl-9 [&>textarea]:pl-9">{children}</div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-[#64748b]">{label}</span>
      <span
        className={`text-xs text-[#0f172a] ${bold ? "font-bold text-[#059669]" : "font-semibold"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Template Preview Modal ────────────────────────────────────
function TemplatePreviewModal({
  template,
  onClose,
  onSelect,
}: {
  template: OnboardingTemplate;
  onClose: () => void;
  onSelect: (t: OnboardingTemplate) => void;
}) {
  const [details, setDetails] = useState<OnboardingTemplateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [currentPage, setCurrentPage] = useState<string>("index");

  useEffect(() => {
    setLoading(true);
    getOnboardingTemplate(template.id)
      .then((res) => setDetails(res.template))
      .catch((err) => toast.error(err.message || "Failed to load template preview"))
      .finally(() => setLoading(false));
  }, [template.id]);

  const htmlContent =
    currentPage === "index"
      ? details?.htmlContent
      : details?.pages?.find((p) => p.name === currentPage)?.htmlContent;
  const pages = details
    ? [
        { name: "index", label: "Home" },
        ...(details.pages || []).map((p) => ({ name: p.name, label: p.name })),
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#07111f] font-sans">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0c1827] px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="font-display font-bold text-white">{template.title}</span>
        </div>

        {/* View Mode & Page Toggles */}
        {!loading && details && (
          <div className="hidden flex-1 items-center justify-center gap-6 sm:flex">
            <div className="flex items-center rounded-lg border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setViewMode("desktop")}
                className={`rounded p-1.5 transition ${viewMode === "desktop" ? "bg-[#06b6d4] text-[#083344]" : "text-slate-400 hover:text-white"}`}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tablet")}
                className={`rounded p-1.5 transition ${viewMode === "tablet" ? "bg-[#06b6d4] text-[#083344]" : "text-slate-400 hover:text-white"}`}
              >
                <Tablet className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("mobile")}
                className={`rounded p-1.5 transition ${viewMode === "mobile" ? "bg-[#06b6d4] text-[#083344]" : "text-slate-400 hover:text-white"}`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            {pages.length > 1 && (
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                className="h-9 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-200 outline-none focus:border-[#06b6d4]"
              >
                {pages.map((p) => (
                  <option key={p.name} value={p.name} className="bg-[#0c1827]">
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onSelect(template)}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-full bg-[#06b6d4] px-4 text-sm font-bold text-[#083344] transition hover:bg-[#22d3ee] disabled:opacity-50"
          >
            Choose Template
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-black p-4 sm:p-8">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[#06b6d4]" />
        ) : (
          <div
            className="flex h-full max-h-full w-full transition-all duration-300"
            style={{
              maxWidth: viewMode === "desktop" ? "100%" : viewMode === "tablet" ? "768px" : "375px",
              border: viewMode === "desktop" ? "none" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: viewMode === "desktop" ? "0" : "12px",
              overflow: "hidden",
            }}
          >
            <iframe
              srcDoc={htmlContent}
              className="h-full w-full bg-white"
              title="Template Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Auto Thumbnail ──────────────────────────────────────────────
function AutoThumbnail({ templateId, title }: { templateId: string; title: string }) {
  const { data } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => getOnboardingTemplate(templateId),
  });

  if (!data?.htmlContent) {
    return (
      <div className="flex h-full items-center justify-center">
        <Globe className="h-12 w-12 text-slate-700 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-white pointer-events-none">
      <iframe
        srcDoc={data.htmlContent}
        title={title}
        tabIndex={-1}
        className="absolute left-0 top-0 border-0 pointer-events-none bg-white"
        style={{
          width: "1280px",
          height: "720px",
          transformOrigin: "top left",
          transform: "scale(0.28125)", // 360 / 1280 (matches the max-w-[360px] width of the card)
        }}
      />
    </div>
  );
}
