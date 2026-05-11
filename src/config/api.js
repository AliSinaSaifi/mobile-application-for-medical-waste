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

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_URL is not set. Define it in your environment (see .env.example at the project root)."
  );
}

/** Same origin as REST API — Socket.io is mounted on this server. */
export const SOCKET_URL = API_BASE_URL;
