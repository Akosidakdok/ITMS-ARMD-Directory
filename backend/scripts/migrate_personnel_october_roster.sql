-- Preserve the source identifiers used by the October personnel roster.
-- Safe to run repeatedly in Supabase SQL Editor.
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS "source_link" TEXT,
  ADD COLUMN IF NOT EXISTS "account_number" TEXT;

COMMENT ON COLUMN public.personnel."source_link" IS
  'Source-system Link value from the October personnel roster; repeated across its three Link columns.';
COMMENT ON COLUMN public.personnel."account_number" IS
  'Account Number value from the October personnel roster.';

NOTIFY pgrst, 'reload schema';
