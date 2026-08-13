import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileEdit,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useId, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authRequest, routeForRole, saveSessionUser } from "@/lib/auth-api";
import { getPublicSettings } from "@/lib/public-api";

type VerificationPurpose = "signup" | "password-reset";

const copy = {
  signup: {
    eyebrow: "Email verification",
    title: "Check your email",
    description:
      "Enter the six-digit verification code from your email to finish creating your account.",
    action: "Verify email",
    backTo: "/create-account" as const,
    backLabel: "Back to account creation",
  },
  "password-reset": {
    eyebrow: "Password reset",
    title: "Check your email",
    description:
      "Enter the six-digit verification code from your email to continue resetting your password.",
    action: "Verify code",
    backTo: "/forgot-password" as const,
    backLabel: "Back to password reset",
  },
} as const;

export function EmailVerificationPage({ purpose }: { purpose: VerificationPurpose }) {
  const text = copy[purpose];
  const titleId = useId();
  const descriptionId = useId();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });
  const siteName = settings["site.name"] || "WebMintra";
  const logoUrl = settings["brand.logoUrl"];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (code.length !== 6 || (purpose === "password-reset" && password.length < 12)) {
      setNotice(
        purpose === "password-reset"
          ? "Enter all six digits and a new password of at least 12 characters."
          : "Enter all six digits from your verification email.",
      );
      return;
    }
    const emailKey =
      purpose === "signup" ? "webmintra:verification-email" : "webmintra:password-reset-email";
    const email = sessionStorage.getItem(emailKey);
    if (!email) {
      setNotice("Start this flow again so we know which email address to verify.");
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await authRequest(
        purpose === "signup" ? "/verify-email" : "/reset-password",
        purpose === "signup" ? { email, code } : { email, code, password },
      );
      if (!result.user)
        throw new Error("Verification succeeded but no session details were returned.");
      saveSessionUser(result.user);
      sessionStorage.removeItem(emailKey);
      // New signups who haven't completed onboarding go to the wizard
      if (purpose === "signup" && !result.user.onboardingCompleted) {
        await navigate({ to: "/onboarding" });
      } else {
        await navigate({ to: routeForRole(result.user.role) });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to process your request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setCode("");
    const emailKey =
      purpose === "signup" ? "webmintra:verification-email" : "webmintra:password-reset-email";
    const email = sessionStorage.getItem(emailKey);
    if (!email) {
      setNotice("Start this flow again so we know which email address to use.");
      return;
    }
    try {
      await authRequest(purpose === "signup" ? "/resend-verification" : "/request-password-reset", {
        email,
      });
      setNotice("If the account is eligible, a new code has been sent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to process your request.");
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
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="h-10 w-10 rounded-xl object-contain shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#06b6d4] text-[#083344] shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                {siteName.charAt(0)}
              </span>
            )}
            {siteName}
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
            aria-describedby={descriptionId}
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#06b6d4]/15 text-[#06b6d4]">
              <Mail className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-bold text-[#06b6d4]">{text.eyebrow}</p>
            <h1 id={titleId} className="mt-3 font-display text-3xl font-bold text-white">
              {text.title}
            </h1>
            <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-slate-400">
              {text.description}
            </p>
            {notice && (
              <div
                className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-relaxed text-slate-200"
                role="status"
              >
                {notice}
              </div>
            )}

            <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label
                  className="block text-sm font-bold text-slate-200"
                  htmlFor="verification-code"
                >
                  Verification code
                </label>
                <InputOTP
                  id="verification-code"
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  aria-describedby={descriptionId}
                  containerClassName="justify-center"
                  className="w-full"
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-11 text-base sm:w-12"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {purpose === "password-reset" && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-200" htmlFor="new-password">
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={12}
                    required
                    autoComplete="new-password"
                    className="h-12 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20"
                  />
                  <p className="text-xs text-slate-500">Use at least 12 characters.</p>
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

            <div className="mt-5 flex flex-col items-center gap-3 border-t border-white/5 pt-5 text-sm">
              <button
                type="button"
                onClick={handleResend}
                className="inline-flex items-center gap-2 font-bold text-[#06b6d4] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4]"
              >
                <RefreshCw className="h-4 w-4" /> Resend code
              </button>
              <Link
                to={text.backTo}
                className="font-semibold text-slate-400 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4]"
              >
                {text.backLabel}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
