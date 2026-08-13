import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/WorkspacePage";
import { getSessionUser, getAuthenticatedUser } from "@/lib/auth-api";

export const Route = createFileRoute("/tenant")({
  component: () => <WorkspacePage requiredRole="tenant" />,
  head: () => ({ meta: [{ title: "Workspace | WebMintra" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    let user = getSessionUser();
    if (!user) {
      user = await getAuthenticatedUser();
    }
    if (!user) throw redirect({ to: "/sign-in", replace: true });
    if (user.role !== "tenant") throw redirect({ to: "/", replace: true });
    // Redirect to onboarding wizard if not completed
    if (!user.onboardingCompleted) throw redirect({ to: "/onboarding", replace: true });
  },
});
