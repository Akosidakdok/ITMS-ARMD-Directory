-- Run once against the existing Supabase database before deploying the app change.
-- Safe to re-run: columns, defaults, and constraints are guarded or idempotent.
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS "agencyType" text NOT NULL DEFAULT 'PNP',
  ADD COLUMN IF NOT EXISTS "agencyName" text NOT NULL DEFAULT '';

UPDATE public.personnel
SET "agencyType" = 'PNP'
WHERE "agencyType" IS NULL OR btrim("agencyType") = '';

UPDATE public.personnel
SET "agencyName" = ''
WHERE "agencyName" IS NULL;

ALTER TABLE public.personnel
  ALTER COLUMN "agencyType" SET DEFAULT 'PNP',
  ALTER COLUMN "agencyType" SET NOT NULL,
  ALTER COLUMN "agencyName" SET DEFAULT '',
  ALTER COLUMN "agencyName" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'personnel_agency_type_and_name_check'
      AND conrelid = 'public.personnel'::regclass
  ) THEN
    ALTER TABLE public.personnel
      ADD CONSTRAINT personnel_agency_type_and_name_check
      CHECK (
        "agencyType" IN ('PNP', 'OTHER_GOVERNMENT')
        AND ("agencyType" = 'PNP' OR length(btrim("agencyName")) > 0)
      );
  END IF;
END
$$;
