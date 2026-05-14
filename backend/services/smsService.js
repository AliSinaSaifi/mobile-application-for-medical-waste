const debug = require('debug')('sms');
require('dotenv').config();

const PROVIDER = (process.env.SMS_PROVIDER || 'console').toLowerCase();

async function sendSmsConsole(to, message) {
  console.log(`📱 [SMS-CONSOLE] to=${to} message=${message}`);
  return { ok: true };
}

async function sendSmsTwilio(to, message) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !from) throw new Error('Twilio not configured');
    // lazy require so server can run without twilio installed
    // eslint-disable-next-line global-require
    const twilio = require('twilio')(accountSid, authToken);
    await twilio.messages.create({ body: message, from, to });
    return { ok: true };
  } catch (err) {
    debug('twilio error', err.message);
    return { ok: false, error: err.message };
  }
}

async function sendSms(to, message) {
  if (PROVIDER === 'twilio') return sendSmsTwilio(to, message);
  return sendSmsConsole(to, message);
}

module.exports = { sendSms };
