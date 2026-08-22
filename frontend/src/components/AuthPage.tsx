import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileEdit,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useId, useState, useEffect } from "react";
import { authRequest, routeForRole, saveSessionUser } from "@/lib/auth-api";
import { getPublicSettings } from "@/lib/public-api";
import { BrandLogo } from "./BrandLogo";

type AuthMode = "sign-in" | "create-account" | "forgot-password";

const copy = {
  "sign-in": {
    title: "Welcome back",
    description: "Sign in to continue updating your website.",
    action: "Sign in",
  },
  "create-account": {
    title: "Start updating your website",
    description: "Create your free account in a few simple steps.",
    action: "Create free account",
  },
  "forgot-password": {
    title: "Reset your password",
    description: "Enter your email address and we will help you get back in.",
    action: "Send reset link",
  },
} as const;

export function AuthPage({ mode }: { mode: AuthMode }) {
  const text = copy[mode];
  const titleId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });
  const siteName = settings["site.name"] || "WebMintra";
  const logoUrl = settings["brand.logoUrl"];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setNotice("");

    if (!form.reportValidity()) return;

    const passwords = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[type="password"], input[data-password]'),
    );
    const [passwordInput, confirmPasswordInput] = passwords;
    if (
      mode === "create-account" &&
      passwordInput &&
      confirmPasswordInput &&
      passwordInput.value !== confirmPasswordInput.value
    ) {
      setNotice("The two passwords do not match. Please enter them again.");
      return;
    }

    const data = new FormData(form);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    try {
      setIsSubmitting(true);

      // Execute Google reCAPTCHA v3 if enabled
      let recaptchaToken: string | null = null;
      const recaptchaSiteKey = settings["security.recaptchaSiteKey"];
      const recaptchaEnabled = settings["security.recaptchaEnabled"];
      if (recaptchaEnabled && recaptchaSiteKey) {
        const { executeRecaptcha } = await import("@/lib/recaptcha");
        recaptchaToken = await executeRecaptcha(recaptchaSiteKey, mode);
      }

      if (mode === "create-account") {
        await authRequest("/register", {
          name: String(data.get("name") ?? ""),
          email,
          password,
          recaptchaToken,
        });
        sessionStorage.setItem("webmintra:verification-email", email);
        await navigate({ to: "/verify-email" });
      } else if (mode === "forgot-password") {
        await authRequest("/request-password-reset", { email });
        sessionStorage.setItem("webmintra:password-reset-email", email);
        await navigate({ to: "/verify-password-reset" });
      } else {
        const result = await authRequest("/login", { email, password, recaptchaToken });
        if (!result.user)
          throw new Error("Sign-in succeeded but no session details were returned.");
        saveSessionUser(result.user);
        await navigate({ to: routeForRole(result.user.role) });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to process your request.";
      if (mode === "sign-in" && (error as { needsVerification?: boolean }).needsVerification) {
        sessionStorage.setItem("webmintra:verification-email", email);
        await navigate({ to: "/verify-email" });
        return;
      }
      setNotice(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="landing-page relative min-h-screen overflow-hidden tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      {/* Ambient Tiranga Glows */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-[440px] w-[440px] rounded-full bg-[#ea580c]/[0.08] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-[440px] w-[440px] rounded-full bg-[#059669]/[0.09] blur-[120px]" />

      {/* Header */}
      <header className="landing-nav-glass fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link to="/" className="flex items-center transition hover:opacity-95">
            <BrandLogo
              logoUrl={isMounted ? logoUrl : undefined}
              siteName={isMounted ? siteName : "webmintra"}
              size="md"
            />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex min-h-screen items-center px-5 sm:px-6 pb-12 pt-24 sm:pb-16 sm:pt-28">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Left: Product Hero Showcase */}
          <aside className="hidden lg:block">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11.5px] font-bold text-[#c2410c] shadow-2xs">
              <span className="text-sm">🇮🇳</span>
              <span>TRUSTED BY 10,000+ INDIAN BUSINESSES</span>
            </div>
            <h2 className="text-[42px] font-extrabold leading-[1.12] text-[#0f172a] tracking-tight">
              Your business website, <br />
              <span className="text-[#059669]">always in your control.</span>
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#475569]">
              Edit pricing, photos, and timings anytime with simple point-and-click tools. Direct
              WhatsApp lead alerts and UPI readiness included.
            </p>

            {/* Interactive Browser Canvas Mockup */}
            <div className="tiranga-border-top mt-8 max-w-xl overflow-hidden rounded-2xl border border-[#cbd5e1] bg-white p-2.5 shadow-xl">
              <div className="flex h-10 items-center justify-between border-b border-[#e2e8f0] px-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                </div>
                <span className="text-xs font-mono font-bold text-[#64748b]">
                  smilecaredental.in
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#059669] border border-[#a7f3d0]">
                  <FileEdit className="h-3 w-3" /> Live Editor
                </span>
              </div>

              <div className="relative h-56 overflow-hidden rounded-b-xl bg-[#fafcfa] p-5 flex flex-col justify-between border-t border-[#f1f5f9]">
                <div className="flex justify-between items-center">
                  <div className="text-[10px] font-bold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                    GREATER KAILASH, DELHI
                  </div>
                  <div className="flex gap-1.5 text-[9px] font-semibold text-[#64748b]">
                    <span>Home</span> · <span>Services</span> · <span>Doctors</span>
                  </div>
                </div>

                <div className="text-center py-2">
                  <span className="inline-block rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-0.5 text-[10px] font-bold text-[#c2410c] mb-1.5">
                    Visual Point & Click
                  </span>
                  <h3 className="text-xl font-extrabold text-[#0f172a]">SmileCare Dental Clinic</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Modern pain-free dentistry with instant WhatsApp booking
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <span className="rounded-lg bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs flex items-center gap-1">
                    <span>💬</span> WhatsApp Book
                  </span>
                  <span className="rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0f172a] shadow-2xs">
                    View Pricing
                  </span>
                </div>
              </div>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-[#475569]">
              {[
                "✓ No coding required",
                "✓ 14-day free trial",
                "✓ Free .in domain",
                "✓ 100% Data Stored in India 🇮🇳",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1">
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          {/* Right: Auth Card */}
          <section
            className="tiranga-border-top mx-auto w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-2xl backdrop-blur-xl"
            aria-labelledby={titleId}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-[11px] font-bold text-[#059669] border border-[#a7f3d0]">
                {mode === "forgot-password" ? "Security Help" : `🇮🇳 ${siteName} Workspace`}
              </span>
            </div>

            <h1
              id={titleId}
              className="mt-4 text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight"
            >
              {text.title}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#64748b] leading-relaxed">
              {text.description}
            </p>

            {notice && (
              <div
                className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium leading-relaxed text-rose-700"
                role="status"
              >
                {notice}
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
              {mode === "create-account" && (
                <Field
                  label="Your Full Name"
                  name="name"
                  autoComplete="name"
                  placeholder="e.g. Rahul Sharma"
                />
              )}

              <Field
                id={emailId}
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.in"
                icon={Mail}
              />

              {mode !== "forgot-password" && (
                <PasswordField
                  id={passwordId}
                  label="Password"
                  name="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  minLength={mode === "create-account" ? 8 : 6}
                  show={showPassword}
                  onShowChange={setShowPassword}
                />
              )}

              {mode === "create-account" && (
                <PasswordField
                  id={confirmPasswordId}
                  label="Confirm password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  show={showPassword}
                  onShowChange={setShowPassword}
                />
              )}

              {mode === "sign-in" && (
                <div className="flex justify-end pt-0.5">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-[#059669] hover:underline transition"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#047857] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? "Please wait..." : text.action}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 border-t border-[#f1f5f9] pt-5 text-center text-xs text-[#64748b]">
              {mode === "sign-in" && (
                <>
                  New to {siteName}?{" "}
                  <Link to="/create-account" className="font-bold text-[#059669] hover:underline">
                    Create a free account
                  </Link>
                </>
              )}
              {mode === "create-account" && (
                <>
                  Already have an account?{" "}
                  <Link to="/sign-in" className="font-bold text-[#059669] hover:underline">
                    Sign in here
                  </Link>
                </>
              )}
              {mode === "forgot-password" && (
                <>
                  Remembered your password?{" "}
                  <Link to="/sign-in" className="font-bold text-[#059669] hover:underline">
                    Return to sign in
                  </Link>
                </>
              )}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: typeof Mail }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold text-[#0f172a]" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
          required
          {...props}
        />
        {Icon && (
          <Icon className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#94a3b8]" />
        )}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  show,
  onShowChange,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  show: boolean;
  onShowChange: (show: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold text-[#0f172a]" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          data-password
          className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 pr-10 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
          required
          minLength={6}
          {...props}
        />
        <button
          type="button"
          onClick={() => onShowChange(!show)}
          className="absolute right-1 top-0.5 grid h-9 w-9 place-items-center rounded-lg text-[#94a3b8] transition hover:text-[#0f172a]"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-[10.5px] text-[#94a3b8]">At least {props.minLength ?? 6} characters.</p>
    </div>
  );
}
