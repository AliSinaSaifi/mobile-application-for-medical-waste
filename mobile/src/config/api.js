/**
 * Native shell API base — must be HTTPS in production builds (set at build time via EAS / Expo env).
 * @see https://docs.expo.dev/guides/environment-variables/
 */
function normalizeBaseUrl(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  return raw.trim().replace(/\/+$/, '');
}

const base = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);

if (!base) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Define it in app config / EAS env (your Railway HTTPS API root, no trailing slash).'
  );
}

export const API_BASE_URL = base;
export const API_TIMEOUT_MS = 12000;
