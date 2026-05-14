/**
 * Ensure JWT secret is set for secure token signing. Missing configuration
 * must stop the process to avoid insecure fallbacks.
 */
function assertJwtConfigured() {
  const key = 'JWT_SECRET';
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    // eslint-disable-next-line no-console
    console.error('JWT_SECRET is missing. Server cannot start securely.');
    process.exit(1);
  }
}

module.exports = { assertJwtConfigured };
