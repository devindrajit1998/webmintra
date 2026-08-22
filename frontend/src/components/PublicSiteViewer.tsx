import { useEffect, useState } from "react";

export function PublicSiteViewer({ subdomain }: { subdomain: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const targetUrl = `${apiUrl}/public/site/${subdomain}${window.location.pathname}${window.location.search}`;

    setLoading(true);
    fetch(targetUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        let text = await res.text();
        text = text.replace(/\/api\/public\/site\//g, `${apiUrl}/public/site/`);
        return text;
      })
      .then((content) => {
        setHtml(content);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [subdomain]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 font-sans text-center">
        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm max-w-md">
          <p className="text-sm font-bold uppercase text-red-600">Site Unavailable</p>
          <h1 className="mt-2 text-xl font-bold text-slate-900">Unable to load website</h1>
          <p className="mt-2 text-xs text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !html) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#059669] border-t-transparent" />
          <p className="text-xs font-bold text-slate-600">Loading website preview...</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      title="Public Website"
      className="fixed inset-0 h-screen w-screen border-0 bg-white"
    />
  );
}
