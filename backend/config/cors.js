/**
 * CLIENT_URL: comma-separated list of allowed browser origins (SPA / WebView).
 * Example: https://app.example.com,https://staging.example.com
 */

function parseOriginList(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildAllowedOrigins() {
  const fromEnv = parseOriginList(process.env.CLIENT_URL);
  const extras = parseOriginList(process.env.CORS_EXTRA_ORIGINS);
  const merged = [...fromEnv, ...extras];
  return [...new Set(merged)];
}

/**
 * Express cors `origin` callback — production-safe: only configured origins.
 * Requests with no `Origin` header (native apps, curl) are allowed.
 * IMPORTANT: Never throw errors in this callback. Return callback(null, false) for blocked origins.
 */
function createCorsOriginCallback(allowedOrigins) {
  return (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  };
}

module.exports = {
  parseOriginList,
  buildAllowedOrigins,
  createCorsOriginCallback,
};
