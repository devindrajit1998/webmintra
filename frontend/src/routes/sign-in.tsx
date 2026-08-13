import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/components/AuthPage";
import { getSessionUser, routeForRole } from "@/lib/auth-api";

export const Route = createFileRoute("/sign-in")({
  component: () => <AuthPage mode="sign-in" />,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = getSessionUser();
    if (user) {
      throw redirect({ to: routeForRole(user.role), replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in | WebMintra" },
      { name: "description", content: "Sign in to WebMintra." },
    ],
  }),
});
