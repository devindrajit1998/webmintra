import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { adminRequest } from "@/lib/admin-api";
import {
  Loader2,
  Search as SearchIcon,
  Users,
  Monitor,
  CreditCard,
  Globe,
  LifeBuoy,
  Mail,
  UserCheck,
  ArrowUpRight,
  Sparkles,
  Command,
} from "lucide-react";

export const Route = createFileRoute("/admin/search")({
  component: SearchPage,
  head: () => ({ meta: [{ title: "Global Search | WebMintra Admin" }] }),
});

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-purple-50 text-purple-700 border-purple-200",
};

function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["adminSearch", query],
    queryFn: () => adminRequest<any>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate({ to: "/admin/search", search: { q: query } as any, replace: true });
    }
  }

  function handleNavigate(type: string, item: any) {
    switch (type) {
      case "tenant":
        navigate({ to: "/admin/tenants", search: { search: item.title } as any });
        break;
      case "website":
        navigate({ to: "/admin/websites", search: { search: item.title } as any });
        break;
      case "payment":
        navigate({ to: "/admin/payments", search: { search: item.title } as any });
        break;
      case "domain":
        navigate({ to: "/admin/domains", search: { search: item.title } as any });
        break;
      case "ticket":
        navigate({ to: "/admin/support" });
        break;
      case "lead":
        navigate({ to: "/admin/leads", search: { search: item.title } as any });
        break;
      default:
        break;
    }
  }

  const results = data?.results || {};
  const hasAnyResults =
    results.tenants?.length > 0 ||
    results.websites?.length > 0 ||
    results.payments?.length > 0 ||
    results.domains?.length > 0 ||
    results.tickets?.length > 0 ||
    results.leads?.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl p-6 lg:p-8 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="border-b border-[#e2e8f0] pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
          <Sparkles className="h-4 w-4 text-[#ea580c]" /> Unified Platform Index
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f172a] mt-1 flex items-center gap-2.5">
          <SearchIcon className="h-7 w-7 text-[#059669]" /> Global Search
        </h1>
        <p className="mt-1 text-xs text-[#64748b]">
          Instant lookup across tenants, websites, CRM leads, domains, invoices, and support
          tickets.
        </p>
      </div>

      {/* ── Search Input Box ─────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="relative">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#059669]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by business name, domain, invoice, phone, email, or lead..."
          className="h-14 w-full rounded-2xl border-2 border-[#cbd5e1] bg-white pl-12 pr-12 text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] shadow-xs outline-none focus:border-[#059669] focus:ring-4 focus:ring-[#059669]/10 transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748b] hover:text-[#0f172a] p-1 cursor-pointer"
          >
            Clear
          </button>
        )}
      </form>

      {/* ── Results Container ────────────────────────────────────── */}
      {query.length > 0 && query.length < 2 ? (
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center text-xs font-bold text-[#64748b]">
          Please enter at least 2 characters to search across platform records.
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-[#e2e8f0] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Searching platform records...</p>
        </div>
      ) : query.trim().length >= 2 ? (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary indicator */}
          <div className="flex items-center justify-between text-xs font-bold text-[#64748b] px-1">
            <span>
              Found <strong>{data?.totalResults || 0}</strong> record
              {data?.totalResults === 1 ? "" : "s"} for &quot;{query}&quot;
            </span>
          </div>

          {/* Tenants */}
          {results.tenants?.length > 0 && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0f172a] border-b border-[#f1f5f9] pb-3">
                <Users className="h-4 w-4 text-[#059669]" /> Tenants ({results.tenants.length})
              </h2>
              <div className="grid gap-2.5">
                {results.tenants.map((t: any) => {
                  const badgeStyle =
                    STATUS_BADGE[t.meta?.toLowerCase()] ||
                    "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleNavigate("tenant", t)}
                      className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-left transition hover:border-[#059669] hover:bg-white cursor-pointer group shadow-2xs"
                    >
                      <div>
                        <p className="font-extrabold text-sm text-[#0f172a] group-hover:text-[#059669] transition flex items-center gap-1.5">
                          {t.title || "Unnamed Tenant"}
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-[#059669]" />
                        </p>
                        <p className="text-xs font-medium text-[#64748b] mt-0.5">
                          {t.subtitle || "No email"}
                        </p>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${badgeStyle}`}
                      >
                        {t.meta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* CRM Leads */}
          {results.leads?.length > 0 && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0f172a] border-b border-[#f1f5f9] pb-3">
                <UserCheck className="h-4 w-4 text-[#059669]" /> CRM Leads &amp; Inquiries (
                {results.leads.length})
              </h2>
              <div className="grid gap-2.5">
                {results.leads.map((l: any) => {
                  const badgeStyle =
                    STATUS_BADGE[l.meta?.toLowerCase()] ||
                    "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <button
                      key={l.id}
                      onClick={() => handleNavigate("lead", l)}
                      className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-left transition hover:border-[#059669] hover:bg-white cursor-pointer group shadow-2xs"
                    >
                      <div>
                        <p className="font-extrabold text-sm text-[#0f172a] group-hover:text-[#059669] transition flex items-center gap-1.5">
                          {l.title || "Unnamed Lead"}
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-[#059669]" />
                        </p>
                        <p className="text-xs font-medium text-[#64748b] mt-0.5">{l.subtitle}</p>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${badgeStyle}`}
                      >
                        {l.meta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Websites */}
          {results.websites?.length > 0 && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0f172a] border-b border-[#f1f5f9] pb-3">
                <Monitor className="h-4 w-4 text-[#059669]" /> Websites ({results.websites.length})
              </h2>
              <div className="grid gap-2.5">
                {results.websites.map((w: any) => {
                  const badgeStyle =
                    STATUS_BADGE[w.meta?.toLowerCase()] ||
                    "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <button
                      key={w.id}
                      onClick={() => handleNavigate("website", w)}
                      className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-left transition hover:border-[#059669] hover:bg-white cursor-pointer group shadow-2xs"
                    >
                      <div>
                        <p className="font-extrabold text-sm text-[#0f172a] group-hover:text-[#059669] transition flex items-center gap-1.5">
                          {w.title}
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-[#059669]" />
                        </p>
                        <p className="text-xs font-medium text-[#64748b] mt-0.5">{w.subtitle}</p>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${badgeStyle}`}
                      >
                        {w.meta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Payments & Invoices */}
          {results.payments?.length > 0 && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0f172a] border-b border-[#f1f5f9] pb-3">
                <CreditCard className="h-4 w-4 text-[#ea580c]" /> Payments &amp; Invoices (
                {results.payments.length})
              </h2>
              <div className="grid gap-2.5">
                {results.payments.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handleNavigate("payment", p)}
                    className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-left transition hover:border-[#ea580c] hover:bg-white cursor-pointer group shadow-2xs"
                  >
                    <div>
                      <p className="font-extrabold text-sm text-[#0f172a] group-hover:text-[#ea580c] transition flex items-center gap-1.5">
                        Invoice #{p.title}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-[#ea580c]" />
                      </p>
                      <p className="text-xs font-medium text-[#64748b] mt-0.5">{p.subtitle}</p>
                    </div>
                    <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-black text-[#c2410c] uppercase">
                      {p.meta}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Domains */}
          {results.domains?.length > 0 && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0f172a] border-b border-[#f1f5f9] pb-3">
                <Globe className="h-4 w-4 text-[#2563eb]" /> Domains ({results.domains.length})
              </h2>
              <div className="grid gap-2.5">
                {results.domains.map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => handleNavigate("domain", d)}
                    className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-left transition hover:border-[#2563eb] hover:bg-white cursor-pointer group shadow-2xs"
                  >
                    <div>
                      <p className="font-extrabold text-sm text-[#0f172a] group-hover:text-[#2563eb] transition flex items-center gap-1.5 font-mono">
                        {d.title}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-[#2563eb]" />
                      </p>
                      <p className="text-xs font-medium text-[#64748b] mt-0.5">{d.subtitle}</p>
                    </div>
                    <span className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 text-[10px] font-black text-[#1d4ed8] uppercase">
                      {d.meta}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Support Tickets */}
          {results.tickets?.length > 0 && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0f172a] border-b border-[#f1f5f9] pb-3">
                <LifeBuoy className="h-4 w-4 text-[#9333ea]" /> Support Tickets (
                {results.tickets.length})
              </h2>
              <div className="grid gap-2.5">
                {results.tickets.map((tk: any) => (
                  <button
                    key={tk.id}
                    onClick={() => handleNavigate("ticket", tk)}
                    className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-left transition hover:border-[#9333ea] hover:bg-white cursor-pointer group shadow-2xs"
                  >
                    <div>
                      <p className="font-extrabold text-sm text-[#0f172a] group-hover:text-[#9333ea] transition flex items-center gap-1.5">
                        {tk.title}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-[#9333ea]" />
                      </p>
                      <p className="text-xs font-medium text-[#64748b] mt-0.5">{tk.subtitle}</p>
                    </div>
                    <span className="rounded-md border border-[#e9d5ff] bg-[#faf5ff] px-2 py-0.5 text-[10px] font-black text-[#7e22ce] uppercase">
                      {tk.meta}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!hasAnyResults && (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-12 text-center">
              <p className="text-sm font-extrabold text-[#0f172a]">No records found</p>
              <p className="mt-1 text-xs text-[#64748b]">
                No matching tenants, websites, CRM leads, invoices, or domains found for &quot;
                {query}&quot;.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-12 text-center text-xs font-semibold text-[#64748b]">
          <Command className="h-8 w-8 text-[#059669] mx-auto mb-2 opacity-80" />
          Type a search term above to locate any record across the WebMintra platform.
        </div>
      )}
    </div>
  );
}
