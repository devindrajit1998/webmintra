import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/AuthPage";

export const Route = createFileRoute("/forgot-password")({
  component: () => <AuthPage mode="forgot-password" />,
  head: () => ({
    meta: [
      { title: "Reset your password | WebMintra" },
      { name: "description", content: "Get help resetting your WebMintra password." },
    ],
  }),
});
