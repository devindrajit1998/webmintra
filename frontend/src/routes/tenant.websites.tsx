import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTenantContext } from "@/components/TenantDashboard";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Globe2,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  BarChart3,
  Settings,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Website, createWebsite } from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/websites")({
  component: WebsitesPage,
  head: () => ({ meta: [{ title: "My Websites | WebMintra" }] }),
});

function WebsitesPage() {
  const { websites } = useTenantContext();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = Route.useNavigate();

  const createMutation = useMutation({
    mutationFn: () => createWebsite("studio"), // default template
    onSuccess: (data) => {
      toast.success("Website created successfully!");
      navigate({ to: "/tenant/builder/$id", params: { id: data.website.id } });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create website");
    },
  });

  const filteredWebsites = websites.filter((site) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-[1600px] space-y-6">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white px-5 py-6 shadow-xs sm:px-7">
        <div className="absolute inset-x-0 top-0 flex h-1" aria-hidden="true">
          <span className="flex-1 bg-[#ea580c]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#059669]" />
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#fff7ed] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-[#ecfdf5] blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c2410c]">
              <Globe2 className="h-3.5 w-3.5" /> Digital India Workspace
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              My Websites
            </h1>
            <p className="mt-1.5 text-sm font-medium text-[#64748b]">
              Manage, edit, and publish all your workspaces from one place.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="search"
                aria-label="Search websites"
                placeholder="Search websites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white py-2.5 pl-9 pr-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 sm:w-64"
              />
            </div>
            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-[#cbd5e1] bg-white text-[#64748b] transition hover:border-[#fdba74] hover:bg-[#fff7ed] hover:text-[#c2410c] sm:flex"
              aria-label="Filter websites"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.7)] transition hover:-translate-y-0.5 hover:bg-[#047857] disabled:pointer-events-none disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Website
            </button>
          </div>
        </div>
      </section>

      {/* Grid Content */}
      {websites.length === 0 ? (
        <EmptyState
          isCreating={createMutation.isPending}
          onCreate={() => createMutation.mutate()}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWebsites.map((website) => (
            <WebsiteCard key={website.id} website={website} />
          ))}
          {filteredWebsites.length === 0 && searchQuery && (
            <div className="col-span-full rounded-2xl border border-dashed border-[#cbd5e1] bg-white py-16 text-center text-sm font-medium text-[#64748b]">
              No websites found matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WebsiteCard({ website }: { website: Website }) {
  const isPublished = website.status === "published";
  const isLocalhost = typeof window !== "undefined" && window.location.hostname.includes("localhost");
  
  // Clean business slug derived from website name (e.g. "webmintra", "lens-and-light")
  const siteSlug = website.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || website.id;
  
  // Full production domain and localhost development link
  const domainString = website.customDomain || `${siteSlug}.webmintra.in`;
  
  const url = isPublished
    ? website.customDomain
      ? `https://${website.customDomain}`
      : isLocalhost
        ? `${window.location.origin}/?preview_site=${siteSlug}`
        : `https://${siteSlug}.webmintra.in`
    : null;

  const displayDomain = domainString;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-[#a7f3d0] hover:shadow-[0_18px_38px_-20px_rgba(5,150,105,0.4)]">
      <div className="absolute inset-x-0 top-0 z-10 flex h-1" aria-hidden="true">
        <span className="flex-1 bg-[#ea580c]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#059669]" />
      </div>
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden bg-[linear-gradient(135deg,#0f172a,#1e3a5f_58%,#065f46)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(234,88,12,.42),transparent_24%),radial-gradient(circle_at_82%_78%,rgba(5,150,105,.42),transparent_30%),linear-gradient(to_bottom,transparent,rgba(15,23,42,.38))]" />
        <div className="absolute bottom-4 left-5 text-white/80">
          <Globe2 className="h-8 w-8" strokeWidth={1.4} />
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <div className="max-w-[80%] truncate rounded-lg border border-white/20 bg-[#0f172a]/45 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
            {website.templateName || "WebMintra Template"}
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-white/80 opacity-0 backdrop-blur-md transition hover:bg-white/15 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="More website actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-extrabold text-[#0f172a] transition-colors group-hover:text-[#047857]">
            {website.name}
          </h3>

          <div className="mt-2 flex items-center gap-2">
            {isPublished ? (
              <span className="flex items-center gap-1.5 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                Published
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ea580c]" />
                Draft
              </span>
            )}
            <span className="text-[10px] font-medium text-[#94a3b8]">
              Updated{" "}
              {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                new Date(website.updatedAt),
              )}
            </span>
          </div>

          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-fit max-w-full items-center gap-1 truncate text-[11px] font-semibold text-[#64748b] transition-colors hover:text-[#059669]"
            >
              {displayDomain}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <p className="mt-3 flex items-center gap-1 text-[11px] font-medium text-[#94a3b8]">
              No domain connected
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-2 border-t border-[#f1f5f9] pt-4">
          <Link
            to="/tenant/builder/$id"
            params={{ id: website.id }}
            className="flex flex-1 items-center justify-center rounded-xl bg-[#0f172a] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#059669]"
          >
            Open Editor
          </Link>
          <button
            type="button"
            className="flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-white p-2.5 text-[#64748b] transition hover:border-[#fed7aa] hover:bg-[#fff7ed] hover:text-[#c2410c]"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-white p-2.5 text-[#64748b] transition hover:border-[#a7f3d0] hover:bg-[#ecfdf5] hover:text-[#047857]"
            aria-label="Analytics"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ isCreating, onCreate }: { isCreating: boolean; onCreate: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-20 text-center shadow-xs">
      <div className="absolute inset-x-0 top-0 flex h-1" aria-hidden="true">
        <span className="flex-1 bg-[#ea580c]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#059669]" />
      </div>
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] text-[#059669] shadow-sm">
        <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-[#fff7ed] ring-1 ring-[#fed7aa]" />
        <Globe2 className="relative z-10 h-10 w-10" />
      </div>
      <h3 className="mt-6 font-display text-xl font-extrabold text-[#0f172a]">No websites yet</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#64748b]">
        You haven't created any websites in this workspace yet. Start by creating your first
        website.
      </p>
      <button
        type="button"
        disabled={isCreating}
        onClick={onCreate}
        className="mt-8 flex items-center gap-2 rounded-xl bg-[#059669] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.7)] transition hover:-translate-y-0.5 hover:bg-[#047857] disabled:opacity-50"
      >
        {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
        Create Website
      </button>
    </div>
  );
}
