-- Orders Soft-Delete Migration
-- Run this in the Supabase SQL editor if you want soft-deleted orders to remain in the database for auditing.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "isDeleted" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

CREATE INDEX IF NOT EXISTS orders_is_deleted_idx
  ON public.orders ("isDeleted");
