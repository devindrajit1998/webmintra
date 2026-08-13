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
  Loader2
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
    }
  });

  const filteredWebsites = websites.filter(site => 
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">My Websites</h1>
          <p className="mt-2 text-sm text-slate-400">Manage, edit, and publish all your workspaces.</p>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search websites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-slate-700/80 bg-slate-900/50 py-2.5 pl-9 pr-4 text-sm text-slate-200 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button type="button" className="hidden sm:flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/50 p-2.5 text-slate-400 hover:text-white transition">
            <Filter className="h-4 w-4" />
          </button>
          <button 
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Website
          </button>
        </div>
      </div>

      {/* Grid Content */}
      {websites.length === 0 ? (
        <EmptyState isCreating={createMutation.isPending} onCreate={() => createMutation.mutate()} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWebsites.map((website) => (
            <WebsiteCard key={website.id} website={website} />
          ))}
          {filteredWebsites.length === 0 && searchQuery && (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm">
              No websites found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WebsiteCard({ website }: { website: Website }) {
  const isPublished = website.status === 'published';
  const url = isPublished 
    ? website.customDomain
      ? `https://${website.customDomain}`
      : `https://${website.id}.webmintra.cloud`
    : null;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-[0_8px_30px_rgba(6,182,212,0.1)] flex flex-col h-full">
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden bg-[linear-gradient(125deg,#0f766e,#0e7490_48%,#312e81)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,.24),transparent_20%),linear-gradient(to_bottom,transparent,rgba(2,6,23,.55))]" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <div className="rounded-lg border border-white/20 bg-slate-950/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
            {website.templateName || "WebMintra Template"}
          </div>
          <button type="button" className="rounded-md p-1.5 text-white/70 hover:bg-slate-950/40 hover:text-white backdrop-blur-md transition opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">{website.name}</h3>
          
          <div className="mt-2 flex items-center gap-2">
            {isPublished ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Published
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                Draft
              </span>
            )}
            <span className="text-[10px] text-slate-500">
              Updated {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(website.updatedAt))}
            </span>
          </div>

          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 transition-colors w-fit">
              {`${website.id}.webmintra.cloud`}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
              No domain connected
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-2 pt-4 border-t border-slate-800/60">
          <Link 
            to="/tenant/builder/$id"
            params={{ id: website.id }}
            className="flex-1 flex items-center justify-center rounded-xl bg-slate-800/50 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-cyan-500 hover:text-slate-950"
          >
            Open Editor
          </Link>
          <button type="button" className="flex items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/20 p-2 text-slate-400 hover:border-slate-600 hover:bg-slate-700 hover:text-white transition" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </button>
          <button type="button" className="flex items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/20 p-2 text-slate-400 hover:border-slate-600 hover:bg-slate-700 hover:text-white transition" aria-label="Analytics">
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ isCreating, onCreate }: { isCreating: boolean, onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/20 px-6 py-24 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400 ring-1 ring-inset ring-cyan-400/20">
        <div className="absolute inset-0 rounded-2xl bg-cyan-400/20 blur-xl"></div>
        <Globe2 className="h-10 w-10 relative z-10" />
      </div>
      <h3 className="mt-6 font-display text-xl font-bold text-white">No websites yet</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
        You haven't created any websites in this workspace yet. Start by creating your first website.
      </p>
      <button 
        type="button"
        disabled={isCreating}
        onClick={onCreate}
        className="mt-8 flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:opacity-50"
      >
        {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
        Create Website
      </button>
    </div>
  );
}
