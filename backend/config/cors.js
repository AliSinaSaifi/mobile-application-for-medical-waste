/**
 * CLIENT_URL: comma-separated list of allowed browser origins (SPA / WebView).
 * Example: https://app.example.com,https://staging.example.com
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];

function isLoopbackHostname(hostname) {
  const normalizedHost = String(hostname || '').toLowerCase();
  return normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '[::1]' || normalizedHost === '::1';
}

function getOriginMatchKey(origin) {
  if (!origin || typeof origin !== 'string') return null;

  try {
    const parsed = new URL(origin);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    if (protocol === 'capacitor:' && hostname === 'localhost') {
      return 'local:localhost';
    }

    if (isLoopbackHostname(hostname) && (protocol === 'http:' || protocol === 'https:' || protocol === 'capacitor:')) {
      return 'local:localhost';
    }

    return parsed.origin.toLowerCase();
  } catch {
    return origin.trim().toLowerCase();
  }
}

function buildAllowedOriginMatchers(allowedOrigins) {
  return new Set(allowedOrigins.map(getOriginMatchKey).filter(Boolean));
}

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
  const merged = [...DEFAULT_ALLOWED_ORIGINS, ...fromEnv, ...extras];
  return [...new Set(merged)];
}

/**
 * Express cors `origin` callback — production-safe: only configured origins.
 * Requests with no `Origin` header (native apps, curl) are allowed.
 * IMPORTANT: Never throw errors in this callback. Return callback(null, false) for blocked origins.
 */
function createCorsOriginCallback(allowedOrigins) {
  const allowedOriginMatchers = buildAllowedOriginMatchers(allowedOrigins);

  return (origin, callback) => {
    if (!origin) return callback(null, true);

    const normalizedOrigin = getOriginMatchKey(origin);
    if (normalizedOrigin && allowedOriginMatchers.has(normalizedOrigin)) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.warn('[CORS] Blocked origin:', origin);
    return callback(null, false);
  };
}

module.exports = {
  parseOriginList,
  DEFAULT_ALLOWED_ORIGINS,
  buildAllowedOrigins,
  createCorsOriginCallback,
};
