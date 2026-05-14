-- MedWaste: legacy OTP cleanup.
-- This script removes obsolete OTP columns from the users table after the
-- Firebase phone verification refactor. Run against PostgreSQL after backup.

BEGIN;

ALTER TABLE users DROP COLUMN IF EXISTS "otpHash";
ALTER TABLE users DROP COLUMN IF EXISTS "otpExpiresAt";
ALTER TABLE users DROP COLUMN IF EXISTS "otpAttempts";
ALTER TABLE users DROP COLUMN IF EXISTS "otpResendCount";
ALTER TABLE users DROP COLUMN IF EXISTS "otpLastSentAt";
ALTER TABLE users DROP COLUMN IF EXISTS "otpResendWindowStartedAt";
ALTER TABLE users DROP COLUMN IF EXISTS "otpLockedUntil";

-- One non-null phone per user (existing duplicates must be resolved before this succeeds)
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique
  ON users ("phoneNumber")
  WHERE "phoneNumber" IS NOT NULL;

COMMIT;