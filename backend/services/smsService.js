const twilio = require('twilio');

function createClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio configuration missing. SMS OTP system cannot start.');
  }
  return { client: twilio(accountSid, authToken), fromNumber };
}

let cached;

function getTwilio() {
  if (!cached) {
    cached = createClient();
  }
  return cached;
}

/**
 * Sends an SMS via Twilio. Throws on failure. Never logs message body or OTP.
 *
 * @param {string} to E.164 destination
 * @param {string} body Message body (caller builds; do not log here)
 * @returns {Promise<{ sid: string, status: string | null, errorCode: number | null, errorMessage: string | null }>}
 */
async function sendSms(to, body) {
  const { client, fromNumber } = getTwilio();
  try {
    const message = await client.messages.create({
      to,
      from: fromNumber,
      body,
    });
    return {
      sid: message.sid,
      status: message.status ?? null,
      errorCode: message.errorCode ?? null,
      errorMessage: message.errorMessage ?? null,
    };
  } catch (err) {
    const code = err.code ?? err.status;
    console.error('[sms] Twilio request failed', {
      code,
      message: err.message,
      moreInfo: err.moreInfo,
    });
    throw err;
  }
}

module.exports = { sendSms };
