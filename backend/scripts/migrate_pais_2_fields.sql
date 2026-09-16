-- ============================================================
-- PAIS 2.0 PERSONNEL & ASSIGNMENT SCHEMA MIGRATION SCRIPT
-- Adds:
--   rankCategory      TEXT  ('PCO' | 'PNCO' | 'NUP')
--   positionCategory  TEXT  ('Main' | 'In Addition/Concurrent')
--   unitCategory      TEXT  ('ITMS HQ' | 'Command Group' | etc.)
--   subUnitCategory   TEXT  ('Division' | 'Center' | 'Office' | etc.)
--   designationDate   TEXT
--   effectiveDate     TEXT
--
-- Safe, idempotent migration script for Supabase SQL Editor.
-- ============================================================

-- 1. Add columns to personnel table
ALTER TABLE personnel
  ADD COLUMN IF NOT EXISTS "rankCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "positionCategory" TEXT DEFAULT 'Main',
  ADD COLUMN IF NOT EXISTS "unitCategory" TEXT DEFAULT 'ITMS HQ',
  ADD COLUMN IF NOT EXISTS "subUnitCategory" TEXT DEFAULT 'Division',
  ADD COLUMN IF NOT EXISTS "designationDate" TEXT,
  ADD COLUMN IF NOT EXISTS "effectiveDate" TEXT;

-- 2. Backfill existing personnel records based on Rank (including PNP slash ranks)
UPDATE personnel
SET "rankCategory" = CASE
  WHEN UPPER(TRIM(rank)) = 'NUP' THEN 'NUP'
  WHEN UPPER(TRIM(rank)) IN (
    'PLT', 'PCPT', 'PMAJ', 'PLTCOL', 'PCOL', 'PBGEN', 'PMGEN', 'PLTGEN', 'PGEN',
    'P/LT', 'P/CPT', 'P/CAPT', 'P/MAJ', 'P/LCOL', 'P/LTCOL', 'P/COL', 'P/BGEN', 'P/MGEN', 'P/LTGEN', 'P/GEN'
  ) OR UPPER(TRIM(rank)) LIKE 'POLICE BRIGADIER%' 
    OR UPPER(TRIM(rank)) LIKE 'POLICE COLONEL%' 
    OR UPPER(TRIM(rank)) LIKE 'POLICE LIEUTENANT%' 
    OR UPPER(TRIM(rank)) LIKE 'POLICE MAJOR%' 
    OR UPPER(TRIM(rank)) LIKE 'POLICE CAPTAIN%' 
    OR UPPER(TRIM(rank)) LIKE 'POLICE GENERAL%' THEN 'PCO'
  ELSE 'PNCO'
END
WHERE "rankCategory" IS NULL OR "rankCategory" = '';

UPDATE personnel
SET "positionCategory" = 'Main'
WHERE "positionCategory" IS NULL OR "positionCategory" = '';

UPDATE personnel
SET "unitCategory" = 'ITMS HQ'
WHERE "unitCategory" IS NULL OR "unitCategory" = '';

UPDATE personnel
SET "subUnitCategory" = 'Division'
WHERE "subUnitCategory" IS NULL OR "subUnitCategory" = '';

-- 3. Create assignments table if missing or add missing columns
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  "personnelId" TEXT NOT NULL,
  unit TEXT NOT NULL,
  position TEXT NOT NULL,
  "orderRef" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  status TEXT DEFAULT 'Current',
  remarks TEXT,
  "positionCategory" TEXT DEFAULT 'Main',
  "unitCategory" TEXT DEFAULT 'ITMS HQ',
  "subUnitCategory" TEXT DEFAULT 'Division',
  sub_unit TEXT,
  details TEXT,
  station TEXT,
  "designationDate" TEXT,
  "effectiveDate" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) on assignments and allow PAIS backend access
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assignments' AND policyname = 'PAIS full access to assignments'
  ) THEN
    CREATE POLICY "PAIS full access to assignments"
      ON public.assignments
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- 5. Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'personnel'
  AND column_name IN ('rankCategory', 'positionCategory', 'unitCategory', 'subUnitCategory', 'station', 'sub_unit', 'details');
