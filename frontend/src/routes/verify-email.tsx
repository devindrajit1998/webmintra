import { createFileRoute } from "@tanstack/react-router";
import { EmailVerificationPage } from "@/components/EmailVerificationPage";

export const Route = createFileRoute("/verify-email")({
  component: () => <EmailVerificationPage purpose="signup" />,
  head: () => ({
    meta: [
      { title: "Verify your email | WebMintra" },
      {
        name: "description",
        content: "Verify your email address to create your WebMintra account.",
      },
    ],
  }),
});
