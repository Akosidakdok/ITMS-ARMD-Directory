-- Additive migration. No personnel or historical assignment records are removed.
BEGIN;
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS "countedUnit" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "dutyAssignments" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "additionalDesignations" JSONB NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.personnel."countedUnit" IS 'Explicit headcount destination; empty uses home sub-unit. Does not change the home posting.';
COMMENT ON COLUMN public.personnel."dutyAssignments" IS 'Main, detail, additional, and technical assistance duties. Does not multiply headcount.';
NOTIFY pgrst, 'reload schema';
COMMIT;
