import { createFileRoute } from "@tanstack/react-router";
import { AdminSeoPage } from "@/components/AdminSeoPage";

export const Route = createFileRoute("/admin/seo")({
    component: AdminSeoPage,
    head: () => ({ meta: [{ title: "Search Optimization | WebMintra" }] }),
});
