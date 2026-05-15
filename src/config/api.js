import { Capacitor } from "@capacitor/core";

/**
 * Single source of truth for API + Socket.io base URL.
 * Set VITE_API_URL in .env (e.g. https://api.example.com — no trailing slash).
 */
function normalizeBaseUrl(raw) {
  if (raw == null || typeof raw !== "string") return "";
  return raw.trim().replace(/\/+$/, "");
}

const PRODUCTION_API_URL = "https://mobile-application-for-medical-waste-production.up.railway.app";
const envApiUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
const isNative = Capacitor.isNativePlatform();
const isLocalApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envApiUrl);

export const API_URL = isNative && (!envApiUrl || isLocalApiUrl)
  ? PRODUCTION_API_URL
  : envApiUrl;
export const API_BASE_URL = API_URL;
/** False when the bundle was built without VITE_API_URL (e.g. local `npm run build` before `cap sync`). */
export const isApiConfigured = Boolean(API_URL);

export const MISSING_API_URL_MESSAGE = "API URL missing. Rebuild app with correct VITE_API_URL";

// Debug: Show what environment value was used at build time
if (import.meta.env.DEV || !API_URL) {
  console.log("[API Config] VITE_API_URL (raw) =", import.meta.env.VITE_API_URL);
  console.log("[API Config] API_BASE_URL (normalized) =", API_URL);
  console.log("[API Config] isApiConfigured =", isApiConfigured);
}

if (!API_URL) {
  console.error(MISSING_API_URL_MESSAGE);
}

/** Same origin as REST API — Socket.io is mounted on this server. */
export const SOCKET_URL = API_URL;
