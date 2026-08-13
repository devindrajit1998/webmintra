import { createFileRoute } from "@tanstack/react-router";
import { TenantDashboardIndex } from "@/components/TenantDashboard";

export const Route = createFileRoute("/tenant/")({
  component: TenantDashboardIndex,
  head: () => ({ meta: [{ title: "Your workspace | WebMintra" }] }),
});
