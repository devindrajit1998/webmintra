import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/components/AuthPage";
import { getSessionUser, routeForRole } from "@/lib/auth-api";

export const Route = createFileRoute("/create-account")({
  component: () => <AuthPage mode="create-account" />,
  beforeLoad: () => {
    const user = getSessionUser();
    if (user) {
      throw redirect({ to: routeForRole(user.role), replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Create your account | WebMintra" },
      { name: "description", content: "Create a free WebMintra account." },
    ],
  }),
});
