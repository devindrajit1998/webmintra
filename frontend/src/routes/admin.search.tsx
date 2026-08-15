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
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin/search")({
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  // Get 'q' from url manually for simplicity, or we could use search params in Tanstack router
  const [query, setQuery] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["adminSearch", query],
    queryFn: () => adminRequest<any>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length > 2,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/admin/search", search: { q: query } as any, replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">Global Search</h1>
        <p className="mt-1 text-xs text-slate-500">
          Search across tenants, websites, and payments.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative mb-8">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for anything..."
          className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-12 pr-4 text-lg text-slate-100 placeholder-slate-500 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </form>

      {query.length > 0 && query.length < 3 ? (
        <div className="py-10 text-center text-slate-500">
          Please enter at least 3 characters to search.
        </div>
      ) : isLoading ? (
        <div className="py-10 text-center text-slate-500">Searching...</div>
      ) : data?.results ? (
        <div className="space-y-8">
          {data.results.tenants?.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Users className="h-4 w-4" /> Tenants ({data.results.tenants.length})
              </h2>
              <div className="grid gap-3">
                {data.results.tenants.map((t: any) => (
                  <button
                    key={t._id}
                    onClick={() =>
                      navigate({ to: "/admin/tenants", search: { search: t.businessName } as any })
                    }
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0b1826] p-4 text-left transition hover:border-slate-700"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{t.businessName || t.name}</p>
                      <p className="text-xs text-slate-500">{t.email}</p>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-1 text-[10px] uppercase text-slate-400">
                      {t.tenantStatus}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {data.results.websites?.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Monitor className="h-4 w-4" /> Websites ({data.results.websites.length})
              </h2>
              <div className="grid gap-3">
                {data.results.websites.map((w: any) => (
                  <button
                    key={w._id}
                    onClick={() =>
                      navigate({ to: "/admin/websites", search: { search: w.name } as any })
                    }
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0b1826] p-4 text-left transition hover:border-slate-700"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{w.name}</p>
                      <p className="text-xs text-slate-500">Template: {w.templateName}</p>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-1 text-[10px] uppercase text-slate-400">
                      {w.status}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {data.results.payments?.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <CreditCard className="h-4 w-4" /> Payments ({data.results.payments.length})
              </h2>
              <div className="grid gap-3">
                {data.results.payments.map((p: any) => (
                  <button
                    key={p._id}
                    onClick={() =>
                      navigate({
                        to: "/admin/payments",
                        search: { search: p.invoiceNumber } as any,
                      })
                    }
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0b1826] p-4 text-left transition hover:border-slate-700"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{p.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">
                        ₹{p.amount} {p.currency}
                      </p>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-1 text-[10px] uppercase text-slate-400">
                      {p.status}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!data.results.tenants?.length &&
            !data.results.websites?.length &&
            !data.results.payments?.length && (
              <div className="py-20 text-center text-slate-500">
                No results found for &quot;{query}&quot;
              </div>
            )}
        </div>
      ) : null}
    </div>
  );
}
