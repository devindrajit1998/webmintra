import { useEffect, useState } from "react";

export function PublicSiteViewer({ subdomain }: { subdomain: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In dev, the API URL is typically http://localhost:5000/api
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    // We construct the backend URL for the public site
    const targetUrl = `${apiUrl}/public/site/${subdomain}${window.location.pathname}${window.location.search}`;

    fetch(targetUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        let text = await res.text();
        // Rewrite relative API paths to absolute API paths so that form submissions
        // and analytics work when viewing the site through the frontend dev server.
        text = text.replace(/\/api\/public\/site\//g, `${apiUrl}/public/site/`);
        return text;
      })
      .then(setHtml)
      .catch((err) => setError(err.message));
  }, [subdomain]);

  if (error) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>Error loading site: {error}</div>
    );
  }

  if (!html) {
    return (
      <div
        style={{
          padding: "2rem",
          fontFamily: "sans-serif",
          textAlign: "center",
          paddingTop: "20vh",
        }}
      >
        Loading...
      </div>
    );
  }

  // We write the HTML directly to the document to replace the React app
  document.open();
  document.write(html);
  document.close();

  return null;
}
