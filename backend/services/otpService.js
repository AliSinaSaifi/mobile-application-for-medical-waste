const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const RESEND_WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

function generateOtpCode() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

function assertValidOtpFormat(code) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    const err = new Error('Verification code must be 6 digits');
    err.status = 400;
    throw err;
  }
}

async function hashOtp(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function compareOtp(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

function assertNotOtpLocked(user) {
  if (user.otpLockedUntil && new Date(user.otpLockedUntil) > new Date()) {
    const err = new Error('Too many failed attempts. Try again later.');
    err.status = 429;
    err.retryAfterSec = Math.ceil((new Date(user.otpLockedUntil) - Date.now()) / 1000);
    throw err;
  }
}

function computeResendFields(user, now = new Date()) {
  const t = now.getTime();
  const windowStartMs = user.otpResendWindowStartedAt
    ? new Date(user.otpResendWindowStartedAt).getTime()
    : null;
  const count = user.otpResendCount || 0;

  if (!windowStartMs || t - windowStartMs > RESEND_WINDOW_MS) {
    return {
      otpResendWindowStartedAt: now,
      otpResendCount: 1,
      otpLastSentAt: now,
    };
  }

  if (count >= MAX_SENDS_PER_WINDOW) {
    const err = new Error('Too many SMS requests. Wait before trying again.');
    err.status = 429;
    throw err;
  }

  return {
    otpResendWindowStartedAt: user.otpResendWindowStartedAt,
    otpResendCount: count + 1,
    otpLastSentAt: now,
  };
}

async function buildFieldsForNewOtp(user, plainCode, now = new Date()) {
  assertNotOtpLocked(user);
  const resend = computeResendFields(user, now);
  const otpHash = await hashOtp(plainCode);
  const otpExpiresAt = new Date(now.getTime() + OTP_TTL_MS);
  return {
    ...resend,
    otpHash,
    otpExpiresAt,
    otpAttempts: 0,
    otpLockedUntil: null,
  };
}

async function evaluateOtpVerification(user, plainCode) {
  assertNotOtpLocked(user);
  assertValidOtpFormat(plainCode);
  const trimmed = plainCode.trim();

  if (!user.otpHash || !user.otpExpiresAt) {
    const err = new Error('No OTP requested');
    err.status = 400;
    throw err;
  }

  if (new Date(user.otpExpiresAt) < new Date()) {
    const err = new Error('OTP expired');
    err.status = 400;
    throw err;
  }

  const matches = await compareOtp(trimmed, user.otpHash);
  if (matches) {
    return {
      matches: true,
      patch: {
        phoneVerified: true,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpResendCount: 0,
        otpResendWindowStartedAt: null,
        otpLastSentAt: null,
        otpLockedUntil: null,
      },
    };
  }

  const attempts = (user.otpAttempts || 0) + 1;
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      matches: false,
      patch: {
        otpAttempts: 0,
        otpHash: null,
        otpExpiresAt: null,
        otpLockedUntil: new Date(Date.now() + LOCKOUT_MS),
      },
    };
  }

  return {
    matches: false,
    patch: { otpAttempts: attempts },
  };
}

module.exports = {
  generateOtpCode,
  assertValidOtpFormat,
  buildFieldsForNewOtp,
  evaluateOtpVerification,
  assertNotOtpLocked,
  OTP_TTL_MS,
  MAX_SENDS_PER_WINDOW,
  RESEND_WINDOW_MS,
};
