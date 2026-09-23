-- Phase 2: role-based personnel relationships and generation snapshots.
-- Run after the existing order migrations.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "purposeData" jsonb,
  ADD COLUMN IF NOT EXISTS "personnelInvolvement" jsonb,
  ADD COLUMN IF NOT EXISTS "personnelSnapshot" jsonb;

CREATE INDEX IF NOT EXISTS orders_personnel_involvement_gin_idx
  ON public.orders USING gin ("personnelInvolvement");
