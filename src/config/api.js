/**
 * Single source of truth for API + Socket.io base URL.
 * Set VITE_API_URL in .env (e.g. https://api.example.com — no trailing slash).
 */
function normalizeBaseUrl(raw) {
  if (raw == null || typeof raw !== "string") return "";
  return raw.trim().replace(/\/+$/, "");
}

export const API_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL);
export const API_BASE_URL = API_URL;
/** False when the bundle was built without VITE_API_URL (e.g. local `npm run build` before `cap sync`). */
export const isApiConfigured = Boolean(API_URL);

export const MISSING_API_URL_MESSAGE = "API URL missing. Rebuild app with correct VITE_API_URL";

if (!API_URL) {
  console.error(MISSING_API_URL_MESSAGE);
}

/** Same origin as REST API — Socket.io is mounted on this server. */
export const SOCKET_URL = API_URL;
