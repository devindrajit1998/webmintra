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
    <div className="relative min-h-screen overflow-hidden bg-[#07111f] font-sans text-slate-200 selection:bg-cyan-500/30">
      {/* Subtle Background Glows */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-25 blur-[140px]">
        <div className="h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-500" />
      </div>
      <div className="pointer-events-none absolute right-10 bottom-10 -z-10 opacity-20 blur-[130px]">
        <div className="h-[380px] w-[380px] rounded-full bg-cyan-600" />
      </div>

      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#07111f]/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-3 font-display text-lg font-bold text-white transition hover:opacity-90"
          >
            {isMounted && logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-9 w-9 object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500 text-white">
                <span className="font-bold">{(isMounted ? siteName : "W").charAt(0)}</span>
              </span>
            )}
            <span className="text-[22px] font-black tracking-tight leading-none bg-gradient-to-r from-[#0055ff] via-[#00c9a7] to-[#10e793] bg-clip-text text-transparent lowercase font-sans">
              {isMounted ? siteName : "webmintra"}
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex min-h-screen items-center px-6 pb-12 pt-28 sm:pb-16 sm:pt-32">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          {/* Left: Product Hero Showcase */}
          <aside className="hidden lg:block">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-md mb-6">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Secure Cloud Workspace
            </span>
            <h2 className="font-display text-5xl font-extrabold leading-[1.15] text-white tracking-tight">
              Your business website, <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                always in your control.
              </span>
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400">
              Edit pricing, photos, and timings anytime with simple point-and-click tools. Preview
              every change before publishing.
            </p>

            {/* Interactive Browser Canvas Mockup */}
            <div className="mt-10 max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1c2e] to-[#0a1523] p-2.5 shadow-2xl">
              <div className="flex h-11 items-center justify-between border-b border-white/5 px-4">
                <div className="flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono font-medium text-slate-400">
                  https://yourbusiness.in
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-cyan-500/20 px-2.5 py-1 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                  <FileEdit className="h-3 w-3" /> Live Editor
                </span>
              </div>

              <div className="relative h-56 overflow-hidden rounded-b-xl bg-[#09131e] p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-24 rounded bg-cyan-500/20 animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-4 w-12 rounded bg-slate-800" />
                    <div className="h-4 w-12 rounded bg-slate-800" />
                  </div>
                </div>

                <div className="text-center py-4">
                  <span className="inline-block rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-0.5 text-[10px] font-bold text-cyan-300 mb-2">
                    Visual Point & Click
                  </span>
                  <h3 className="font-display text-2xl font-extrabold text-white">
                    Grow your business with confidence
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Ready for appointment bookings & lead generation
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <span className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md">
                    Book Appointment
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300">
                    Our Services
                  </span>
                </div>
              </div>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
              {[
                "✓ No coding required",
                "✓ 15-day free trial",
                "✓ Custom domain ready",
                "✓ Free cloud hosting",
              ].map((item) => (
                <li key={item} className="text-slate-300">
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          {/* Right: Auth Card */}
          <section
            className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e1c2e] to-[#0a1523] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10"
            aria-labelledby={titleId}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-400 border border-cyan-500/20">
                {mode === "forgot-password" ? "Security Help" : `${siteName} Workspace`}
              </span>
            </div>

            <h1
              id={titleId}
              className="mt-4 font-display text-3xl font-extrabold text-white tracking-tight"
            >
              {text.title}
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{text.description}</p>

            {notice && (
              <div
                className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium leading-relaxed text-rose-300"
                role="status"
              >
                {notice}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
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
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
                  >
                    Forgot your password?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.35)] transition hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? "Please wait..." : text.action}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 border-t border-white/5 pt-6 text-center text-xs text-slate-400">
              {mode === "sign-in" && (
                <>
                  New to {siteName}?{" "}
                  <Link
                    to="/create-account"
                    className="font-bold text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline"
                  >
                    Create a free account
                  </Link>
                </>
              )}
              {mode === "create-account" && (
                <>
                  Already have an account?{" "}
                  <Link
                    to="/sign-in"
                    className="font-bold text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline"
                  >
                    Sign in here
                  </Link>
                </>
              )}
              {mode === "forgot-password" && (
                <>
                  Remembered your password?{" "}
                  <Link
                    to="/sign-in"
                    className="font-bold text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline"
                  >
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
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-300" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className="h-11 w-full rounded-xl border border-white/10 bg-[#07111f] px-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
          required
          {...props}
        />
        {Icon && (
          <Icon className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
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
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-300" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          data-password
          className="h-11 w-full rounded-xl border border-white/10 bg-[#07111f] px-3.5 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
          required
          minLength={6}
          {...props}
        />
        <button
          type="button"
          onClick={() => onShowChange(!show)}
          className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:text-white"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">At least {props.minLength ?? 6} characters.</p>
    </div>
  );
}
