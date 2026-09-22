-- Orders Phase 1: controlled classification and document lifecycle fields.
-- Run this script in the Supabase SQL editor before using the new order form
-- against a persistent database.

-- The Orders table is not created by the original project migrations in some
-- environments. Create the complete base table first so this script works on
-- a fresh Supabase project as well as an existing one.
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  "personnelIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "orderNumber" TEXT NOT NULL,
  "orderType" TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  issuer TEXT,
  "issuedDate" DATE,
  "effectiveDate" DATE,
  type TEXT,
  signatory TEXT,
  "signatoryTitle" TEXT,
  "affectedPersonnelCount" INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active',
  "downloadUrl" TEXT,
  series TEXT,
  "purposeCode" TEXT,
  "purposeLabel" TEXT,
  "documentStatus" TEXT DEFAULT 'Draft',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS series TEXT,
  ADD COLUMN IF NOT EXISTS "purposeCode" TEXT,
  ADD COLUMN IF NOT EXISTS "purposeLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "documentStatus" TEXT;

-- Preserve existing records while moving them toward the new lifecycle field.
UPDATE public.orders
SET "documentStatus" = CASE
  WHEN status IN ('Archived', 'Revoked') THEN status
  WHEN status = 'Pending' THEN 'For Approval'
  WHEN status = 'Active' OR status IS NULL OR status = '' THEN 'Draft'
  ELSE status
END
WHERE "documentStatus" IS NULL OR "documentStatus" = '';

-- Best-effort classification for existing generic order types. Records that do
-- not match remain available for administrative review.
UPDATE public.orders
SET series = COALESCE(series, CASE
  WHEN LOWER(COALESCE("orderType", '')) LIKE '%general%' THEN 'GO'
  WHEN LOWER(COALESCE("orderType", '')) LIKE '%letter%' THEN 'LO'
  ELSE 'SO'
END),
"purposeCode" = COALESCE("purposeCode", CASE
  WHEN LOWER(COALESCE("orderType", '')) LIKE '%assignment%' THEN 'AO'
  WHEN LOWER(COALESCE("orderType", '')) LIKE '%promotion%' THEN 'PR'
  WHEN LOWER(COALESCE("orderType", '')) LIKE '%award%'
    OR LOWER(COALESCE("orderType", '')) LIKE '%commend%' THEN 'AW'
  WHEN LOWER(COALESCE("orderType", '')) LIKE '%relief%' THEN 'TDS'
  WHEN LOWER(COALESCE("orderType", '')) LIKE '%movement%' THEN 'DO'
  ELSE 'DES'
END)
WHERE series IS NULL OR "purposeCode" IS NULL;

CREATE INDEX IF NOT EXISTS orders_series_idx ON public.orders (series);
CREATE INDEX IF NOT EXISTS orders_purpose_code_idx ON public.orders ("purposeCode");
CREATE INDEX IF NOT EXISTS orders_document_status_idx ON public.orders ("documentStatus");

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'PAIS can read orders'
  ) THEN
    CREATE POLICY "PAIS can read orders"
      ON public.orders FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'PAIS can insert orders'
  ) THEN
    CREATE POLICY "PAIS can insert orders"
      ON public.orders FOR INSERT TO anon, authenticated
      WITH CHECK (length(trim("orderNumber")) > 0 AND length(trim("orderType")) > 0 AND length(trim(subject)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'PAIS can update orders'
  ) THEN
    CREATE POLICY "PAIS can update orders"
      ON public.orders FOR UPDATE TO anon, authenticated
      USING (true)
      WITH CHECK (length(trim("orderNumber")) > 0 AND length(trim("orderType")) > 0 AND length(trim(subject)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'PAIS can delete orders'
  ) THEN
    CREATE POLICY "PAIS can delete orders"
      ON public.orders FOR DELETE TO anon, authenticated USING (true);
  END IF;
END
$$;
