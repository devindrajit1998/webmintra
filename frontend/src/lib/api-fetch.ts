const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001/api";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfTokenRequest) {
    csrfTokenRequest = fetch(`${API_URL}/csrf-token`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          csrfToken?: string;
          message?: string;
        };
        if (!response.ok || !payload.csrfToken)
          throw new Error(payload.message ?? "Unable to initialize request security.");
        csrfToken = payload.csrfToken;
        return payload.csrfToken;
      })
      .finally(() => {
        csrfTokenRequest = null;
      });
  }
  return csrfTokenRequest;
}

function methodOf(options?: RequestInit) {
  return (options?.method ?? "GET").toUpperCase();
}

export async function apiFetch(
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> {
  const method = methodOf(options);
  if (SAFE_METHODS.has(method)) {
    return fetch(input, { credentials: "include", ...options });
  }

  const token = await fetchCsrfToken();
  const headers = new Headers(options.headers);
  headers.set("X-CSRF-Token", token);
  let response = await fetch(input, { credentials: "include", ...options, headers });

  if (response.status === 403) {
    const clone = response.clone();
    const payload = (await clone.json().catch(() => ({}))) as { message?: string };
    if (payload.message === "CSRF validation failed.") {
      csrfToken = null;
      headers.set("X-CSRF-Token", await fetchCsrfToken());
      response = await fetch(input, { credentials: "include", ...options, headers });
    }
  }
  return response;
}

export function clearCsrfToken() {
  csrfToken = null;
}
