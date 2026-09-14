-- ============================================================
-- SALARY GRADE COLUMN TYPE MIGRATION SCRIPT
-- Ensures "salaryGrade" column is TEXT to store numbers, dashes, and letters (e.g. 'SG-14', '14-1', '14')
-- Run this in your Supabase SQL Editor if salaryGrade was created as integer/numeric.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'salaryGrade'
  ) THEN
    ALTER TABLE personnel ALTER COLUMN "salaryGrade" TYPE TEXT USING "salaryGrade"::TEXT;
  ELSE
    ALTER TABLE personnel ADD COLUMN IF NOT EXISTS "salaryGrade" TEXT;
  END IF;
END $$;

-- Verify column definition
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'personnel' AND column_name = 'salaryGrade';
