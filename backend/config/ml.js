const DEFAULT_ML_TIMEOUT_MS = 5000;

function getMlConfig() {
  const rawUrl = String(process.env.ML_SERVICE_URL || '').trim();
  const timeoutMs = Number(process.env.ML_SERVICE_TIMEOUT_MS) || DEFAULT_ML_TIMEOUT_MS;

  if (!rawUrl) {
    return {
      enabled: false,
      reason: 'ML_SERVICE_URL is not configured',
      timeoutMs,
      url: null,
    };
  }

  try {
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('ML_SERVICE_URL must use http or https');
    }

    return {
      enabled: true,
      reason: null,
      timeoutMs,
      url: url.toString().replace(/\/+$/, ''),
    };
  } catch (err) {
    return {
      enabled: false,
      reason: `Invalid ML_SERVICE_URL: ${err.message}`,
      timeoutMs,
      url: null,
    };
  }
}

function logMlStatus() {
  const config = getMlConfig();
  console.log(`ML_ENABLED: ${config.enabled ? 'true' : 'false'}`);
  if (config.enabled) {
    console.log(`ML_SERVICE_URL: ${config.url}`);
    console.log(`ML_SERVICE_TIMEOUT_MS: ${config.timeoutMs}`);
  } else {
    console.warn(`ML_DISABLED_REASON: ${config.reason}`);
  }
}

module.exports = {
  getMlConfig,
  logMlStatus,
};
