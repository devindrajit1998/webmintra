import { createFileRoute } from "@tanstack/react-router";
import { EmailVerificationPage } from "@/components/EmailVerificationPage";

export const Route = createFileRoute("/verify-password-reset")({
  component: () => <EmailVerificationPage purpose="password-reset" />,
  head: () => ({
    meta: [
      { title: "Verify password reset | WebMintra" },
      {
        name: "description",
        content: "Verify your email to continue resetting your WebMintra password.",
      },
    ],
  }),
});
