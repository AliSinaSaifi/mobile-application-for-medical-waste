/**
 * Twilio is mandatory for SMS OTP. Missing configuration must stop the process.
 */
function assertTwilioConfigured() {
  const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Twilio configuration missing. SMS OTP system cannot start.');
    process.exit(1);
  }
}

module.exports = { assertTwilioConfigured };
