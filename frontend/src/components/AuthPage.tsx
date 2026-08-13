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
      if (mode === "create-account") {
        await authRequest("/register", { name: String(data.get("name") ?? ""), email, password });
        sessionStorage.setItem("webmintra:verification-email", email);
        await navigate({ to: "/verify-email" });
      } else if (mode === "forgot-password") {
        await authRequest("/request-password-reset", { email });
        sessionStorage.setItem("webmintra:password-reset-email", email);
        await navigate({ to: "/verify-password-reset" });
      } else {
        const result = await authRequest("/login", { email, password });
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
    <div className="min-h-screen overflow-x-hidden bg-[#07111f] font-sans text-slate-200 selection:bg-[#06b6d4]/30">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#07111f]/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-3 font-display text-lg font-bold text-white transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4]"
          >
            {isMounted && logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="h-10 w-10 rounded-xl object-contain shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#06b6d4] text-[#083344] shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                {(isMounted ? siteName : "WebMintra").charAt(0)}
              </span>
            )}
            {isMounted ? siteName : "WebMintra"}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 py-2 text-sm font-semibold text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4]"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to home</span>
          </Link>
        </div>
      </header>

      <main className="relative flex min-h-screen items-center px-5 pb-10 pt-28 sm:px-6 sm:pb-16 sm:pt-32">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
          <aside className="hidden lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 px-4 py-1.5 text-xs font-bold text-[#06b6d4]">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure website management
            </p>
            <h2 className="mt-7 max-w-xl font-display text-5xl font-bold leading-[1.1] text-white">
              Your business website, always in your control.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              Edit content, preview every change, and publish when you are ready without waiting for
              a developer.
            </p>

            <div className="mt-10 max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c1827] p-2 shadow-2xl">
              <div className="flex h-11 items-center justify-between border-b border-white/5 px-3">
                <div className="flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs text-slate-400">Your Website</span>
                <span className="flex items-center gap-1.5 rounded bg-[#06b6d4]/20 px-2.5 py-1 text-[10px] font-bold text-[#06b6d4]">
                  <FileEdit className="h-3 w-3" /> Edit
                </span>
              </div>
              <div className="relative h-52 overflow-hidden rounded-b-xl">
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80"
                  alt="Website editor preview"
                  className="absolute inset-0 h-full w-full object-cover opacity-45"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07111f]/40 px-8 text-center">
                  <h3 className="font-display text-2xl font-bold text-white">
                    Grow your business with confidence
                  </h3>
                  <span className="mt-5 rounded-md bg-[#06b6d4] px-5 py-2 text-xs font-bold text-[#083344]">
                    Learn More
                  </span>
                </div>
              </div>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-400">
              {["No coding", "No credit card", "Preview before publishing"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#06b6d4]" /> {item}
                </li>
              ))}
            </ul>
          </aside>

          <section
            className="fade-up mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1827] p-6 shadow-2xl sm:p-8"
            aria-labelledby={titleId}
          >
            <p className="text-sm font-bold text-[#06b6d4]">
              {mode === "forgot-password" ? "Password help" : `${siteName} account`}
            </p>
            <h1 id={titleId} className="mt-3 font-display text-3xl font-bold text-white">
              {text.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{text.description}</p>

            {notice && (
              <div
                className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-relaxed text-slate-200"
                role="status"
              >
                {notice}
              </div>
            )}

            <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
              {mode === "create-account" && (
                <Field label="Your name" name="name" autoComplete="name" placeholder="Your name" />
              )}
              <Field
                id={emailId}
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                icon={Mail}
              />
              {mode !== "forgot-password" && (
                <PasswordField
                  id={passwordId}
                  label="Password"
                  name="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  minLength={mode === "create-account" ? 12 : 8}
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
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-bold text-[#06b6d4] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4]"
                  >
                    Forgot your password?
                  </Link>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#06b6d4] px-5 text-sm font-bold text-[#083344] shadow-[0_0_20px_rgba(6,182,212,0.25)] transition hover:bg-[#22d3ee] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67e8f9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1827] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Please wait..." : text.action}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 border-t border-white/5 pt-6 text-center text-sm text-slate-400">
              {mode === "sign-in" && (
                <>
                  New to {siteName}?{" "}
                  <Link
                    to="/create-account"
                    className="font-bold text-[#06b6d4] underline-offset-4 hover:underline"
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
                    className="font-bold text-[#06b6d4] underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </>
              )}
              {mode === "forgot-password" && (
                <>
                  Remembered your password?{" "}
                  <Link
                    to="/sign-in"
                    className="font-bold text-[#06b6d4] underline-offset-4 hover:underline"
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
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-200" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className="h-12 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20"
          required
          {...props}
        />
        {Icon && (
          <Icon className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 text-slate-500" />
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
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-200" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          data-password
          className="h-12 w-full rounded-lg border border-white/10 bg-black/20 px-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20"
          required
          minLength={8}
          {...props}
        />
        <button
          type="button"
          onClick={() => onShowChange(!show)}
          className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-md text-slate-500 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4]"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-xs text-slate-500">Use at least {props.minLength ?? 8} characters.</p>
    </div>
  );
}
