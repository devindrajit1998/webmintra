import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth-api";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingWizard,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = getSessionUser();
    // Must be signed in
    if (!user) throw redirect({ to: "/sign-in", replace: true });
    // Onboarding already done → go to dashboard
    if (user.onboardingCompleted) throw redirect({ to: "/tenant", replace: true });
  },
  head: () => ({
    meta: [{ title: "Set up your account | WebMintra" }],
  }),
});
