-- ============================================================================
-- PAIS 2.0 PERSONNEL SCHEMA REFACTORING & OPTIMIZATION MIGRATION
-- Project: PNP-ITMS Personnel and Assignment Information System (PAIS 2.0)
-- Description:
--   1. Ensures all official 15-column personnel fields and metadata are present
--   2. Normalizes column data types and default constraints
--   3. Synchronizes redundant legacy fields (birthday <-> birthdate, etc.)
--   4. Creates performance indexes on frequently queried personnel fields
--   5. Verifies and maintains Row Level Security (RLS) policies
-- Safe and idempotent for execution in Supabase SQL Editor / migration runner.
-- ============================================================================

-- Step 1: Ensure All Schema Columns Exist
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS "id" TEXT PRIMARY KEY,
  ADD COLUMN IF NOT EXISTS "rank" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "rankFullName" TEXT,
  ADD COLUMN IF NOT EXISTS "rankCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "middleName" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "qualifier" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "fullName" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "badgeNo" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "salaryGrade" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "plantilla" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "positionCategory" TEXT DEFAULT 'Main',
  ADD COLUMN IF NOT EXISTS "unitCategory" TEXT DEFAULT 'ITMS HQ',
  ADD COLUMN IF NOT EXISTS "subUnitCategory" TEXT DEFAULT 'Division',
  ADD COLUMN IF NOT EXISTS "sub_unit" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "details" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "station" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "division" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "detail" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "designation" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "designationDate" TEXT,
  ADD COLUMN IF NOT EXISTS "effectiveDate" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'Male',
  ADD COLUMN IF NOT EXISTS "contactNumber" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "birthday" TEXT,
  ADD COLUMN IF NOT EXISTS "dateOfEntry" TEXT,
  ADD COLUMN IF NOT EXISTS "enterInOfficerPositionDate" TEXT,
  ADD COLUMN IF NOT EXISTS "lastPromotionDate" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "officeDivision" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "qualification" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "ageToDate" TEXT,
  ADD COLUMN IF NOT EXISTS "birthdate" TEXT,
  ADD COLUMN IF NOT EXISTS "ageOfServiceToDate" TEXT,
  ADD COLUMN IF NOT EXISTS "desUp" TEXT,
  ADD COLUMN IF NOT EXISTS "pnco" TEXT,
  ADD COLUMN IF NOT EXISTS "nup" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Ensure salaryGrade column can store alphanumeric formats ('SG-14', '14-1', '14')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'personnel' 
      AND column_name = 'salaryGrade' 
      AND data_type IN ('integer', 'smallint', 'bigint', 'numeric')
  ) THEN
    ALTER TABLE public.personnel ALTER COLUMN "salaryGrade" TYPE TEXT USING "salaryGrade"::TEXT;
  END IF;
END $$;

-- Step 3: Backfill and Synchronize Alias / Cross-Compatible Fields
UPDATE public.personnel
SET
  -- Synchronize birthdate and birthday
  "birthdate" = COALESCE(NULLIF("birthdate", ''), "birthday"),
  "birthday" = COALESCE(NULLIF("birthday", ''), "birthdate"),

  -- Synchronize qualifier and qualification
  "qualification" = COALESCE(NULLIF("qualification", ''), "qualifier"),
  "qualifier" = COALESCE(NULLIF("qualifier", ''), "qualification"),

  -- Synchronize sub_unit, division, and officeDivision
  "sub_unit" = COALESCE(NULLIF("sub_unit", ''), NULLIF("officeDivision", ''), "division"),
  "officeDivision" = COALESCE(NULLIF("officeDivision", ''), NULLIF("sub_unit", ''), "division"),
  "division" = COALESCE(NULLIF("division", ''), "sub_unit"),

  -- Synchronize details and detail
  "details" = COALESCE(NULLIF("details", ''), "detail"),
  "detail" = COALESCE(NULLIF("detail", ''), "details"),

  -- Synchronize dateOfEntry and desUp
  "desUp" = COALESCE(NULLIF("desUp", ''), "dateOfEntry"),
  "dateOfEntry" = COALESCE(NULLIF("dateOfEntry", ''), "desUp"),

  -- Derive rankCategory if not yet set
  "rankCategory" = CASE
    WHEN "rankCategory" IS NOT NULL AND "rankCategory" <> '' THEN "rankCategory"
    WHEN UPPER(TRIM(COALESCE("rank", ''))) = 'NUP' THEN 'NUP'
    WHEN UPPER(TRIM(COALESCE("rank", ''))) IN (
      'PLT', 'PCPT', 'PMAJ', 'PLTCOL', 'PCOL', 'PBGEN', 'PMGEN', 'PLTGEN', 'PGEN',
      'P/LT', 'P/CPT', 'P/CAPT', 'P/MAJ', 'P/LCOL', 'P/LTCOL', 'P/COL', 'P/BGEN', 'P/MGEN', 'P/LTGEN', 'P/GEN'
    ) OR UPPER(TRIM(COALESCE("rank", ''))) LIKE 'POLICE %' THEN 'PCO'
    ELSE 'PNCO'
  END,

  -- Ensure fullName is properly composed
  "fullName" = CASE
    WHEN "fullName" IS NOT NULL AND "fullName" <> '' THEN "fullName"
    ELSE TRIM(CONCAT_WS(' ', "firstName", NULLIF("middleName", ''), "lastName", NULLIF("qualifier", '')))
  END
WHERE "id" IS NOT NULL;

-- Step 4: Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_personnel_badge_no ON public.personnel ("badgeNo");
CREATE INDEX IF NOT EXISTS idx_personnel_rank ON public.personnel ("rank");
CREATE INDEX IF NOT EXISTS idx_personnel_rank_category ON public.personnel ("rankCategory");
CREATE INDEX IF NOT EXISTS idx_personnel_status ON public.personnel ("status");
CREATE INDEX IF NOT EXISTS idx_personnel_sub_unit ON public.personnel ("sub_unit");
CREATE INDEX IF NOT EXISTS idx_personnel_last_name ON public.personnel ("lastName");
CREATE INDEX IF NOT EXISTS idx_personnel_created_at ON public.personnel ("createdAt");

-- Step 5: Row Level Security (RLS) Verification
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'personnel' 
      AND policyname = 'PAIS full access to personnel'
  ) THEN
    CREATE POLICY "PAIS full access to personnel"
      ON public.personnel
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Step 6: Verification Query
SELECT 
  COUNT(*) AS total_personnel,
  COUNT("rank") AS with_rank,
  COUNT(NULLIF("badgeNo", '')) AS with_badge,
  COUNT("birthdate") AS with_birthdate,
  COUNT("sub_unit") AS with_sub_unit,
  COUNT("designation") AS with_designation
FROM public.personnel;
