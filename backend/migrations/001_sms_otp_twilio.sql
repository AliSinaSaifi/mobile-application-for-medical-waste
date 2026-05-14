-- MedWaste: production SMS OTP schema (Twilio-only backend).
-- Run against your PostgreSQL database after backup.
-- phoneVerified column = "isPhoneVerified" semantics from product spec.

BEGIN;

-- OTP state (bcrypt-hashed code server-side; never store plaintext)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpHash" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpResendCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpLastSentAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpResendWindowStartedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpLockedUntil" TIMESTAMP WITH TIME ZONE;

-- Legacy plaintext-hash OTP columns (pre-Twilio hardening). Safe to drop after deploy:
-- in-flight legacy OTPs will need a fresh send.
ALTER TABLE users DROP COLUMN IF EXISTS "phoneVerificationCodeHash";
ALTER TABLE users DROP COLUMN IF EXISTS "phoneVerificationExpiresAt";

-- One non-null phone per user (existing duplicates must be resolved before this succeeds)
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique
  ON users ("phoneNumber")
  WHERE "phoneNumber" IS NOT NULL;

COMMIT;
