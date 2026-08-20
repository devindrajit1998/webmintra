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
    <div className="landing-page min-h-screen overflow-x-hidden tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      <header className="landing-nav-glass fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 transition hover:opacity-90"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ea580c] to-[#059669] text-white shadow-xs font-bold text-sm">
                W
              </div>
            )}
            <span className="text-[21px] font-black tracking-tight text-[#0f172a] lowercase">
              {siteName}
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Back to home</span>
          </Link>
        </div>
      </header>

      <main className="relative flex min-h-screen items-center px-5 pb-10 pt-24 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11.5px] font-bold text-[#c2410c] shadow-2xs">
              <span className="text-sm">🇮🇳</span>
              <span>100% SECURE INDIAN CLOUD</span>
            </div>
            <h2 className="text-[42px] font-extrabold leading-[1.12] text-[#0f172a] tracking-tight">
              Your business website, <br />
              <span className="text-[#059669]">always in your control.</span>
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#475569]">
              Edit content, preview every change, and publish when you are ready without waiting for a developer.
            </p>
            <div className="tiranga-border-top mt-8 max-w-xl overflow-hidden rounded-2xl border border-[#cbd5e1] bg-white p-2.5 shadow-xl">
              <div className="flex h-10 items-center justify-between border-b border-[#e2e8f0] px-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                </div>
                <span className="text-xs font-mono font-bold text-[#64748b]">yourbusiness.in</span>
                <span className="flex items-center gap-1.5 rounded-md bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#059669] border border-[#a7f3d0]">
                  <FileEdit className="h-3 w-3" /> Edit
                </span>
              </div>
              <div className="relative h-48 overflow-hidden rounded-b-xl bg-[#fafcfa] p-5 flex flex-col justify-center items-center text-center">
                <h3 className="text-xl font-extrabold text-[#0f172a]">
                  Grow your business with confidence
                </h3>
                <p className="text-xs text-[#64748b] mt-1">
                  Ready for customer bookings & instant WhatsApp enquiries
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-lg bg-[#059669] px-4 py-1.5 text-xs font-bold text-white shadow-xs">
                    Live Preview
                  </span>
                </div>
              </div>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-[#475569]">
              {["✓ No coding", "✓ 14-day free trial", "✓ 100% Data Stored in India 🇮🇳"].map((item) => (
                <li key={item} className="flex items-center gap-1">
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          <section
            className="tiranga-border-top mx-auto w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-7 sm:p-9 shadow-2xl"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
              <Mail className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-bold text-[#059669]">{text.eyebrow}</p>
            <h1 id={titleId} className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#0f172a]">
              {text.title}
            </h1>
            <p id={descriptionId} className="mt-2 text-xs sm:text-sm leading-relaxed text-[#64748b]">
              {text.description}
            </p>
            {notice && (
              <div
                className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium leading-relaxed text-amber-800"
                role="status"
              >
                {notice}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-bold text-[#0f172a]"
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
                        className="h-11 w-11 text-base sm:w-12 border-[#cbd5e1] text-[#0f172a]"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {purpose === "password-reset" && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#0f172a]" htmlFor="new-password">
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
                    className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
                  />
                  <p className="text-[10.5px] text-[#94a3b8]">Use at least 12 characters.</p>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? "Please wait..." : text.action}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#f1f5f9] pt-5 text-xs text-[#64748b]">
              <button
                type="button"
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 font-bold text-[#059669] hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Resend code
              </button>
              <Link
                to={text.backTo}
                className="font-bold text-[#64748b] hover:text-[#0f172a] hover:underline"
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
