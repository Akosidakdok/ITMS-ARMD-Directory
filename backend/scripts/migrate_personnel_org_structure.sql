-- ============================================================
-- PERSONNEL ORGANIZATIONAL STRUCTURE MIGRATION SCRIPT
-- Renames/migrates:
--   DIVISION  -> SUB-UNIT (sub_unit)
--   SUB-UNIT  -> DETAILS  (details)
--   Adds new  -> STATION  (station)
-- Preserves all existing personnel data without deleting records.
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Add new columns if they do not already exist
ALTER TABLE personnel
  ADD COLUMN IF NOT EXISTS "sub_unit" TEXT,
  ADD COLUMN IF NOT EXISTS "details"  TEXT,
  ADD COLUMN IF NOT EXISTS "station"  TEXT;

-- 2. Migrate data from existing columns (division -> sub_unit, detail -> details)
UPDATE personnel
SET
  "sub_unit" = COALESCE("sub_unit", "division"),
  "details"  = COALESCE("details", "detail")
WHERE "sub_unit" IS NULL OR "details" IS NULL;

-- 3. Verify columns and sample data
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'personnel'
  AND column_name IN ('sub_unit', 'details', 'station', 'division', 'detail');

SELECT id, "fullName", "sub_unit", "details", "station"
FROM personnel
LIMIT 5;
