/**
 * Single source of truth for API + Socket.io base URL (no port/host guessing).
 * Set VITE_API_URL in .env (e.g. https://api.example.com — no trailing slash).
 */
function normalizeBaseUrl(raw) {
  if (raw == null || typeof raw !== "string") return "";
  return raw.trim().replace(/\/+$/, "");
}

const raw = import.meta.env.VITE_API_URL;
export const API_BASE_URL = normalizeBaseUrl(raw);
/** False when the bundle was built without VITE_API_URL (e.g. local `npm run build` before `cap sync`). */
export const isApiConfigured = Boolean(API_BASE_URL);

if (import.meta.env.DEV && !API_BASE_URL) {
  throw new Error(
    "VITE_API_URL is not set. Define it in .env or .env.local (see .env.example at the project root)."
  );
}

if (import.meta.env.PROD && !API_BASE_URL) {
  console.error(
    "[MedWaste] VITE_API_URL was not set at build time. API and realtime will not work until you rebuild with VITE_API_URL=https://your-railway-api.example"
  );
}

/** Same origin as REST API — Socket.io is mounted on this server. */
export const SOCKET_URL = API_BASE_URL;
