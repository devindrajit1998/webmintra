import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronRight,
  CreditCard, Globe, Loader2, Mail, MapPin, Phone, Sparkles, Star, Zap,
  Eye, X, Monitor, Tablet, Smartphone
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import {
  getOnboardingPlans, getOnboardingTemplates, getOnboardingTemplate, createRazorpayOrder, verifyOnboardingPayment,
  saveSessionUser, routeForRole, getAuthenticatedUser,
  type OnboardingPlan, type OnboardingTemplate, type OnboardingTemplateDetails, type BusinessInfo,
} from "@/lib/auth-api";

declare const Razorpay: any;

const STEPS = ["Business Details", "Choose Plan", "Choose Template", "Payment"] as const;
type Step = 0 | 1 | 2 | 3;

const EMPTY_BUSINESS: BusinessInfo = { name: "", logoUrl: "", address: "", email: "", phone: "", description: "" };

// ── Helper: load Razorpay checkout script ─────────────────────
function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof Razorpay !== "undefined") { resolve(true); return; }
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
    if (step === 0 && !business.name.trim()) { toast.error("Business name is required."); return; }
    if (step === 1 && !selectedPlan) { toast.error("Please choose a plan."); return; }
    if (step === 2 && !selectedTemplate) { toast.error("Please choose a template."); return; }
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
        const result = await verifyOnboardingPayment({ planId: selectedPlan.id, templateId: selectedTemplate.id, interval, business });
        toast.success(result.message || "Onboarding complete!");
        const user = await getAuthenticatedUser(true);
        if (user) { saveSessionUser({ ...user, onboardingCompleted: true }); }
        await navigate({ to: routeForRole("tenant"), replace: true });
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Could not load payment gateway. Try again."); return; }

      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) { toast.error("Razorpay key is not configured."); return; }

      await new Promise<void>((resolve, reject) => {
        const rzp = new Razorpay({
          key: keyId,
          order_id: order.razorpayOrderId,
          amount: (order.amount || 0) * 100,
          currency: order.currency || "INR",
          name: "WebMintra",
          description: `${selectedPlan.name} – ${interval}`,
          prefill: { name: business.name, email: business.email || "", contact: business.phone || "" },
          theme: { color: "#06b6d4" },
          handler: async (razorpayResponse: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
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
  });

  const logoUrl = settings["brand.logoUrl"];
  const siteName = settings["brand.siteName"] || "WebMintra";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#07111f] font-sans text-slate-200">
      {/* Left Sidebar (Progress) */}
      <div className="flex w-full flex-col border-b border-white/5 bg-[#0c1827] lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r lg:border-white/5 xl:w-[380px]">
        {/* Branding */}
        <div className="flex items-center gap-3 p-6 lg:p-8">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-8 w-8 rounded-lg object-contain shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#06b6d4] font-bold text-[#083344] shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              {siteName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="font-display text-base font-bold text-white">{siteName} Setup</span>
        </div>
        
        {/* Steps Tracker */}
        <div className="flex flex-row overflow-x-auto px-6 pb-6 lg:flex-col lg:overflow-visible lg:px-8 lg:pb-8 scrollbar-hide">
          {STEPS.map((label, i) => (
            <div key={label} className="relative flex flex-row items-center lg:mb-8 lg:flex-col lg:items-start last:mb-0">
               <div className="flex items-center gap-4">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                    i < step ? "bg-[#06b6d4] text-[#083344]"
                    : i === step ? "border-2 border-[#06b6d4] text-[#06b6d4]"
                    : "border border-white/20 bg-black/20 text-slate-500"
                  }`}>
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`whitespace-nowrap text-sm font-semibold transition-colors ${
                    i === step ? "text-white" : i < step ? "text-[#06b6d4]" : "text-slate-500"
                  }`}>{label}</span>
               </div>
               
               {/* Connector Line */}
               {i < STEPS.length - 1 && (
                 <div className={`
                    mx-4 h-px w-8 lg:absolute lg:left-4 lg:top-8 lg:mx-0 lg:-ml-px lg:h-[calc(100%+1rem)] lg:w-px 
                    transition-colors ${i < step ? "bg-[#06b6d4]" : "bg-white/10"}
                 `} />
               )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex w-full max-w-[1400px] flex-1 flex-col justify-center px-6 py-12 lg:pl-12 lg:pr-6 lg:py-20 xl:pl-20">
          
          {step === 0 && <BusinessStep business={business} onChange={setBusiness} />}
          {step === 1 && <PlanStep plans={plans} loading={loadingPlans} selected={selectedPlan} interval={interval} onSelect={setSelectedPlan} onIntervalChange={setInterval} />}
          {step === 2 && selectedPlan && <TemplateStep templates={templates} categories={categories} selectedCategory={selectedCategory} loading={loadingTemplates} selected={selectedTemplate} onSelect={setSelectedTemplate} onCategoryChange={setSelectedCategory} onPreview={setPreviewTemplate} />}
          {step === 3 && selectedPlan && selectedTemplate && (
            <PaymentStep plan={selectedPlan} template={selectedTemplate} business={business} interval={interval} onPay={handlePay} isPaying={isPaying} />
          )}

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-10">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-full bg-[#06b6d4] px-8 py-3 text-sm font-bold text-[#083344] shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-[#22d3ee]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying}
                className="inline-flex items-center gap-2 rounded-full bg-[#06b6d4] px-8 py-3 text-sm font-bold text-[#083344] shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-[#22d3ee] disabled:opacity-50"
              >
                {isPaying ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><CreditCard className="h-4 w-4" /> Pay & Complete Setup</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={(t) => { setSelectedTemplate(t); setPreviewTemplate(null); }}
        />
      )}
    </div>
  );
}

// ── Step 1: Business Details ──────────────────────────────────
function BusinessStep({ business, onChange }: { business: BusinessInfo; onChange: (b: BusinessInfo) => void }) {
  const set = (field: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...business, [field]: e.target.value });

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-2 text-sm font-bold text-[#06b6d4]">Step 1 of 4</p>
      <h1 className="font-display text-3xl font-bold text-white">Tell us about your business</h1>
      <p className="mt-2 text-slate-400">This information will appear on your website.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="Business name *" icon={<Building2 className="h-4 w-4" />}>
          <input value={business.name} onChange={set("name")} placeholder="My Business" maxLength={120} required className={inputCls} />
        </Field>
        <Field label="Business email" icon={<Mail className="h-4 w-4" />}>
          <input type="email" value={business.email} onChange={set("email")} placeholder="hello@mybusiness.com" maxLength={254} className={inputCls} />
        </Field>
        <Field label="Phone number" icon={<Phone className="h-4 w-4" />}>
          <input type="tel" value={business.phone} onChange={set("phone")} placeholder="+91 98765 43210" maxLength={20} className={inputCls} />
        </Field>
        <Field label="Website / Address" icon={<MapPin className="h-4 w-4" />}>
          <input value={business.address} onChange={set("address")} placeholder="123 Main St, City" maxLength={300} className={inputCls} />
        </Field>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Brief description</label>
          <textarea value={business.description} onChange={set("description")} placeholder="What does your business do?" maxLength={500} rows={3} className={`${inputCls} h-auto py-3`} />
          <p className="mt-1 text-right text-xs text-slate-500">{business.description.length}/500</p>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Plan Selection ────────────────────────────────────
function PlanStep({ plans, loading, selected, interval, onSelect, onIntervalChange }: {
  plans: OnboardingPlan[]; loading: boolean; selected: OnboardingPlan | null;
  interval: "monthly" | "yearly"; onSelect: (p: OnboardingPlan) => void; onIntervalChange: (i: "monthly" | "yearly") => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-[#06b6d4]">Step 2 of 4</p>
      <h1 className="font-display text-3xl font-bold text-white">Choose your plan</h1>
      <p className="mt-2 text-slate-400">Pick the plan that suits your business best.</p>

      {/* Billing toggle */}
      <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0c1827] p-1">
        {(["monthly", "yearly"] as const).map((opt) => (
          <button key={opt} type="button" onClick={() => onIntervalChange(opt)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${interval === opt ? "bg-[#06b6d4] text-[#083344]" : "text-slate-400 hover:text-white"}`}>
            {opt === "monthly" ? "Monthly" : "Yearly (save ~20%)"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#06b6d4]" /></div>
      ) : (
        <div className="mt-12 flex flex-wrap gap-8 justify-start">
          {plans.map((plan) => {
            const price = interval === "yearly" ? plan.pricing.yearly : plan.pricing.monthly;
            const isSelected = selected?.id === plan.id;
            return (
              <button key={plan.id} type="button" onClick={() => onSelect(plan)}
                className={`group relative flex w-full max-w-[340px] shrink-0 flex-col rounded-3xl border p-8 text-left transition duration-300 ${isSelected ? "border-[#06b6d4] bg-[#06b6d4]/10 shadow-[0_0_30px_rgba(6,182,212,0.15)] -translate-y-2" : "border-white/5 bg-[#0c1827] hover:border-white/10 hover:-translate-y-1 hover:bg-[#0f1d30]"}`}>
                {isSelected && <div className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-[#06b6d4] text-[#083344]"><Check className="h-4 w-4" /></div>}
                <h3 className="font-display text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white">₹{price.toLocaleString("en-IN")}</span>
                  <span className="ml-1 text-sm text-slate-400">/{interval === "yearly" ? "yr" : "mo"}</span>
                </div>
                {plan.trialDays > 0 && <p className="mt-1 text-xs text-emerald-400">{plan.trialDays}-day free trial</p>}
                <div className="mt-5 flex-1 border-t border-white/10 pt-5">
                  <ul className="space-y-3">
                    {/* Highlights */}
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#06b6d4]" />{h}</li>
                    ))}
                    
                    {/* Limits */}
                    {plan.limits.pagesPerWebsite > 0 && (
                      <li className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#06b6d4]" />Up to {plan.limits.pagesPerWebsite} pages</li>
                    )}
                    {plan.limits.websites > 1 && (
                      <li className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#06b6d4]" />{plan.limits.websites} Websites</li>
                    )}
                    {plan.limits.customDomains > 0 && (
                      <li className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#06b6d4]" />{plan.limits.customDomains} Custom Domains</li>
                    )}
                    
                    {/* Features */}
                    {plan.features && Object.entries(plan.features).map(([key, active]) => (
                       <li key={key} className={`flex items-start gap-2 text-sm ${active ? "text-slate-300" : "text-slate-500 opacity-70"}`}>
                         {active ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#06b6d4]" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />}
                         <span className={active ? "" : "line-through"}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</span>
                       </li>
                    ))}
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
function TemplateStep({ templates, categories, selectedCategory, loading, selected, onSelect, onCategoryChange, onPreview }: {
  templates: OnboardingTemplate[]; categories: string[]; selectedCategory: string; loading: boolean;
  selected: OnboardingTemplate | null; onSelect: (t: OnboardingTemplate) => void; onCategoryChange: (c: string) => void; onPreview: (t: OnboardingTemplate) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-[#06b6d4]">Step 3 of 4</p>
      <h1 className="font-display text-3xl font-bold text-white">Choose a template</h1>
      <p className="mt-2 text-slate-400">Pick a design that matches your business type. Templates are filtered to match your plan.</p>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => onCategoryChange("")}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${!selectedCategory ? "border-[#06b6d4] bg-[#06b6d4]/10 text-[#06b6d4]" : "border-white/10 text-slate-400 hover:text-white"}`}>
            All
          </button>
          {categories.map((cat) => (
            <button key={cat} type="button" onClick={() => onCategoryChange(cat)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${selectedCategory === cat ? "border-[#06b6d4] bg-[#06b6d4]/10 text-[#06b6d4]" : "border-white/10 text-slate-400 hover:text-white"}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#06b6d4]" /></div>
      ) : templates.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-white/10 bg-[#0c1827] p-12 text-center">
          <p className="text-slate-400">No templates match your current filters. Try selecting a different category.</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-8 justify-start">
          {templates.map((t) => {
            const isSelected = selected?.id === t.id;
            return (
              <div key={t.id} role="button" tabIndex={0} onClick={() => onSelect(t)} onKeyDown={(e) => e.key === "Enter" && onSelect(t)}
                className={`group relative flex w-full max-w-[360px] shrink-0 flex-col rounded-3xl border text-left transition overflow-hidden cursor-pointer ${isSelected ? "border-[#06b6d4] shadow-[0_0_20px_rgba(6,182,212,0.2)] -translate-y-1" : "border-white/10 bg-[#0c1827] hover:border-white/20 hover:-translate-y-1"}`}>
                {isSelected && <div className="absolute right-3 top-3 z-10 grid h-6 w-6 place-items-center rounded-full bg-[#06b6d4] text-[#083344]"><Check className="h-4 w-4" /></div>}
                <div className="relative aspect-video bg-slate-800">
                  {t.thumbnailUrl ? (
                    <img src={t.thumbnailUrl} alt={t.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-80" />
                  ) : (
                    <AutoThumbnail templateId={t.id} title={t.title} />
                  )}
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onPreview(t); }} className="inline-flex items-center gap-2 rounded-full bg-[#06b6d4] px-4 py-2 text-xs font-bold text-[#083344] shadow-lg hover:bg-[#22d3ee]">
                      <Eye className="h-4 w-4" /> Preview
                    </button>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex items-center justify-between">
                    <span className="rounded bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{t.category}</span>
                    <span className="rounded bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{t.pageCount} page{t.pageCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="bg-[#0c1827] p-4">
                  <p className="font-bold text-white">{t.title}</p>
                  {t.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{t.description}</p>}
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
function PaymentStep({ plan, template, business, interval, onPay, isPaying }: {
  plan: OnboardingPlan; template: OnboardingTemplate; business: BusinessInfo;
  interval: "monthly" | "yearly"; onPay: () => void; isPaying: boolean;
}) {
  const price = interval === "yearly" ? plan.pricing.yearly : plan.pricing.monthly;
  const isFree = price === 0;

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-2 text-sm font-bold text-[#06b6d4]">Step 4 of 4</p>
      <h1 className="font-display text-3xl font-bold text-white">{isFree ? "Confirm & Start" : "Review & Pay"}</h1>
      <p className="mt-2 text-slate-400">{isFree ? "You're on a free plan. Click confirm to finish setup." : "Review your order before completing payment."}</p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-white/5 bg-[#0c1827]">
        <div className="p-8 space-y-6">
          <SummaryRow label="Business" value={business.name || "—"} />
          <SummaryRow label="Plan" value={`${plan.name} (${interval})`} />
          <SummaryRow label="Template" value={template.title} />
        </div>
        
        <div className="bg-[#0f1d30] border-t border-white/5 p-8">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-300">Total</span>
            <span className="text-3xl font-bold text-white">
              {isFree ? "Free" : `₹${price.toLocaleString("en-IN")}`}
              {!isFree && <span className="text-sm font-normal text-slate-400 ml-1">/ {interval === "yearly" ? "year" : "month"}</span>}
            </span>
          </div>

          {plan.trialDays > 0 && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
              <Sparkles className="h-5 w-5 shrink-0" />
              {plan.trialDays}-day free trial included. You won't be charged until the trial ends.
            </div>
          )}
        </div>
      </div>

      {!isFree && (
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <Zap className="h-4 w-4 text-[#06b6d4]" />
          Secure payment powered by Razorpay. Your card details are never stored on our servers.
        </div>
      )}
    </div>
  );
}

// ── UI Helpers ────────────────────────────────────────────────
const inputCls = "h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20";

function Field({ label, icon, className, children }: { label: string; icon: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
        <div className="[&>input]:pl-9 [&>textarea]:pl-9">{children}</div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-white" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}

// ── Template Preview Modal ────────────────────────────────────
function TemplatePreviewModal({ template, onClose, onSelect }: { template: OnboardingTemplate; onClose: () => void; onSelect: (t: OnboardingTemplate) => void; }) {
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

  const htmlContent = currentPage === "index" ? details?.htmlContent : details?.pages?.find(p => p.name === currentPage)?.htmlContent;
  const pages = details ? [{ name: "index", label: "Home" }, ...(details.pages || []).map(p => ({ name: p.name, label: p.name }))] : [];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#07111f] font-sans">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0c1827] px-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
          <span className="font-display font-bold text-white">{template.title}</span>
        </div>
        
        {/* View Mode & Page Toggles */}
        {!loading && details && (
          <div className="hidden flex-1 items-center justify-center gap-6 sm:flex">
            <div className="flex items-center rounded-lg border border-white/10 bg-black/20 p-1">
              <button type="button" onClick={() => setViewMode("desktop")} className={`rounded p-1.5 transition ${viewMode === "desktop" ? "bg-[#06b6d4] text-[#083344]" : "text-slate-400 hover:text-white"}`}><Monitor className="h-4 w-4" /></button>
              <button type="button" onClick={() => setViewMode("tablet")} className={`rounded p-1.5 transition ${viewMode === "tablet" ? "bg-[#06b6d4] text-[#083344]" : "text-slate-400 hover:text-white"}`}><Tablet className="h-4 w-4" /></button>
              <button type="button" onClick={() => setViewMode("mobile")} className={`rounded p-1.5 transition ${viewMode === "mobile" ? "bg-[#06b6d4] text-[#083344]" : "text-slate-400 hover:text-white"}`}><Smartphone className="h-4 w-4" /></button>
            </div>
            
            {pages.length > 1 && (
              <select 
                value={currentPage} 
                onChange={(e) => setCurrentPage(e.target.value)}
                className="h-9 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-200 outline-none focus:border-[#06b6d4]"
              >
                {pages.map(p => <option key={p.name} value={p.name} className="bg-[#0c1827]">{p.label}</option>)}
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
              overflow: "hidden"
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
