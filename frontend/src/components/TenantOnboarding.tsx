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
    <main className="surface-grid min-h-screen bg-background px-5 py-8 text-foreground sm:py-12">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 font-display font-black text-primary">
            W
          </span>
          <div>
            <p className="font-display font-bold">WebMintra</p>
            <p className="text-xs text-muted-foreground">Set up your business workspace</p>
          </div>
        </div>
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <span
              key={item}
              className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <section className="panel p-6 shadow-panel sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">
            Step {step} of 5
          </p>
          {notice ? (
            <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              {notice}
            </p>
          ) : null}
          {step === 1 ? (
            <Step
              title="Verify your phone number"
              description="We use phone verification to protect your business workspace."
            >
              <label className="block text-sm font-bold">
                Phone number with country code
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+919876543210"
                  className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-3"
                />
              </label>
              <button
                disabled={busy}
                onClick={() => void sendPhoneCode()}
                className="primary-button"
              >
                <Phone className="h-4 w-4" />
                Send verification code
              </button>
            </Step>
          ) : null}
          {step === 2 ? (
            <Step
              title="Enter your phone code"
              description="SMS is not configured in this environment. Use fixed development code 123456."
            >
              <label className="block text-sm font-bold">
                Six-digit code
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-3 tracking-[.5em]"
                />
              </label>
              <button
                disabled={busy}
                onClick={() => void confirmPhone()}
                className="primary-button"
              >
                <Check className="h-4 w-4" />
                Verify phone
              </button>
            </Step>
          ) : null}
          {step === 3 ? (
            <Step
              title="Tell us about your business"
              description="These details power your business profile and future website content."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(business).map(([key, value]) => (
                  <label
                    className={`block text-sm font-bold ${key === "description" || key === "address" ? "sm:col-span-2" : ""}`}
                    key={key}
                  >
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}
                    <input
                      value={value}
                      onChange={(event) =>
                        setBusiness((current) => ({ ...current, [key]: event.target.value }))
                      }
                      className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </label>
                ))}
              </div>
              <button
                disabled={busy || !business.name}
                onClick={() => setStep(4)}
                className="primary-button"
              >
                Continue to plan <ChevronRight className="h-4 w-4" />
              </button>
            </Step>
          ) : null}
          {step === 4 ? (
            <Step
              title="Choose your plan"
              description="Start with a plan that suits your business. You can upgrade later."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {["starter", "growth", "pro"].map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => setPlan(option)}
                    className={`rounded-xl border p-4 text-left ${plan === option ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    <p className="font-display text-lg font-bold capitalize">{option}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {option === "starter"
                        ? "1 website · 1 GB storage"
                        : option === "growth"
                          ? "3 websites · 10 GB storage"
                          : "10 websites · 50 GB storage"}
                    </p>
                  </button>
                ))}
              </div>
              <button disabled={busy} onClick={() => setStep(5)} className="primary-button">
                Continue to templates <ChevronRight className="h-4 w-4" />
              </button>
            </Step>
          ) : null}
          {step === 5 ? (
            <Step
              title="Choose a template"
              description="Select an existing WebMintra template. Your website will be created as a private draft."
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search templates"
                    className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
                  />
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((template) => (
                  <article
                    className="rounded-xl border border-border bg-card p-4"
                    key={template.id}
                  >
                    <div className="h-20 rounded-lg bg-[linear-gradient(135deg,#0f766e,#312e81)]" />
                    <p className="mt-4 font-display font-bold">{template.name}</p>
                    <p className="mt-1 text-xs text-primary">{template.category}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {template.description}
                    </p>
                    <button
                      disabled={busy}
                      onClick={() => void chooseTemplate(template.id)}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"
                    >
                      Choose template <Sparkles className="h-4 w-4" />
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
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-7 space-y-5">{children}</div>
    </div>
  );
}
