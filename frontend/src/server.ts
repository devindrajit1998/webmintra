import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Dynamic SEO endpoints: Fetch real-time sitemap and robots from backend with dynamic DB content
    if (url.pathname === "/sitemap.xml" || url.pathname === "/robots.txt") {
      try {
        const backendOrigin = (process.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
        const backendRes = await fetch(`${backendOrigin}${url.pathname}`, {
          headers: {
            "x-forwarded-host": url.host,
            "x-forwarded-proto": url.protocol.replace(":", ""),
          },
        });
        if (backendRes.ok) {
          const contentType = url.pathname === "/sitemap.xml" ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8";
          const body = await backendRes.text();
          return new Response(body, {
            status: 200,
            headers: {
              "content-type": contentType,
              "cache-control": url.pathname === "/sitemap.xml" ? "public, max-age=3600, s-maxage=3600" : "public, max-age=86400, s-maxage=86400",
            },
          });
        }
      } catch (err) {
        console.warn(`[SEO Proxy] Failed to fetch dynamic ${url.pathname} from backend, falling back to static file:`, err);
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

