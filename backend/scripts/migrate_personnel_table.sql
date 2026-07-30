-- ============================================================
-- PERSONNEL TABLE MIGRATION SCRIPT
-- Adds all missing columns to match the full Personnel schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Personnel Info columns
ALTER TABLE personnel
  ADD COLUMN IF NOT EXISTS "rankFullName"        TEXT,
  ADD COLUMN IF NOT EXISTS "firstName"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "middleName"          TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastName"            TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "qualifier"           TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "address"             TEXT,
  ADD COLUMN IF NOT EXISTS "gender"              TEXT,
  ADD COLUMN IF NOT EXISTS "contactNumber"       TEXT,
  ADD COLUMN IF NOT EXISTS "birthday"            TEXT,
  ADD COLUMN IF NOT EXISTS "dateOfEntry"         TEXT,
  ADD COLUMN IF NOT EXISTS "enterInOfficerPositionDate" TEXT,
  ADD COLUMN IF NOT EXISTS "status"              TEXT DEFAULT 'Active',

-- Summary Profile columns
  ADD COLUMN IF NOT EXISTS "detail"              TEXT,
  ADD COLUMN IF NOT EXISTS "designation"         TEXT,
  ADD COLUMN IF NOT EXISTS "lastPromotionDate"   TEXT,
  ADD COLUMN IF NOT EXISTS "avatarUrl"           TEXT;

-- ============================================================
-- VERIFY: Show all columns after migration
-- ============================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'personnel'
ORDER BY ordinal_position;
