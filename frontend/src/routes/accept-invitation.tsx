import { createFileRoute } from "@tanstack/react-router";
import { InvitationAcceptance } from "@/components/InvitationAcceptance";

export const Route = createFileRoute("/accept-invitation")({
  component: InvitationAcceptance,
  head: () => ({ meta: [{ title: "Accept invitation | WebMintra" }] }),
});
