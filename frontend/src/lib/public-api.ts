const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export async function getPublicSettings(): Promise<Record<string, any>> {
  const response = await fetch(`${API_URL}/public/settings`);
  const payload = await response.json().catch(() => ({}));
  return payload.settings || {};
}
