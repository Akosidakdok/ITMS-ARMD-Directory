-- Phase 6: order register metadata used for filtering and audit display.
-- Run after the Phase 1 through Phase 5 migrations.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "signedAt" timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "signedBy" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "releasedAt" timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "releasedBy" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "createdBy" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "updatedBy" text;

CREATE INDEX IF NOT EXISTS orders_issued_date_idx ON public.orders ("issuedDate");
CREATE INDEX IF NOT EXISTS orders_effective_date_idx ON public.orders ("effectiveDate");
CREATE INDEX IF NOT EXISTS orders_signed_at_idx ON public.orders ("signedAt");
CREATE INDEX IF NOT EXISTS orders_released_at_idx ON public.orders ("releasedAt");
CREATE INDEX IF NOT EXISTS orders_created_by_idx ON public.orders ("createdBy");
