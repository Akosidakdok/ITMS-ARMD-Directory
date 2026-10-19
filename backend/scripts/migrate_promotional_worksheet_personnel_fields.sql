-- ============================================================================
-- PAIS 2.0: PROMOTIONAL WORKSHEET EXTENSION FIELDS MIGRATION
-- Project: PNP-ITMS Personnel and Assignment Information System (PAIS 2.0)
--
-- Description:
--   Adds optional extension columns to public.personnel table for direct
--   promotional worksheet synchronization (Eligibility, Mandatory Course, Time In Grade).
--   Run this in your Supabase SQL Editor.
--   Zero downtime, non-destructive, idempotent DDL.
-- ============================================================================

ALTER TABLE public.personnel
  -- Highest Educational Attainment
  ADD COLUMN IF NOT EXISTS "highestEducationalAttainment" TEXT,
  ADD COLUMN IF NOT EXISTS "highest_educational_attainment" TEXT,

  -- Appropriate Eligibility
  ADD COLUMN IF NOT EXISTS "civilServiceEligibility" TEXT,
  ADD COLUMN IF NOT EXISTS "civil_service_eligibility" TEXT,

  -- Highest Mandatory Course
  ADD COLUMN IF NOT EXISTS "mandatoryCourse" TEXT,
  ADD COLUMN IF NOT EXISTS "mandatory_course" TEXT,

  -- Time in Grade / Experience (Cached derived value)
  ADD COLUMN IF NOT EXISTS "timeInGrade" TEXT,
  ADD COLUMN IF NOT EXISTS "time_in_grade" TEXT;

-- Verify columns after migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'personnel'
  AND column_name IN (
    'highestEducationalAttainment', 'highest_educational_attainment',
    'civilServiceEligibility', 'civil_service_eligibility',
    'mandatoryCourse', 'mandatory_course',
    'timeInGrade', 'time_in_grade'
  )
ORDER BY column_name;
