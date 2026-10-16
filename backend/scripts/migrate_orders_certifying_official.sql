-- Add editable certifying official details to administrative orders.
-- Safe to run repeatedly in the Supabase SQL Editor after the order table exists.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "certifyingOfficial" TEXT,
  ADD COLUMN IF NOT EXISTS "certifyingOfficialRank" TEXT,
  ADD COLUMN IF NOT EXISTS "certifyingOfficialPosition" TEXT;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN ('certifyingOfficial', 'certifyingOfficialRank', 'certifyingOfficialPosition')
ORDER BY column_name;
