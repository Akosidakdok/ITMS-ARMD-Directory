-- Give posting assignments stable links to their authorizing orders and retain
-- snapshots when later orders change or revoke a posting.
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "endedByOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "terminationOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "relatedOrderIds" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "orderEffectHistory" JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS "revokedByOrderId" TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "assignmentEffectStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "assignmentEffectMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "assignmentEffectsAppliedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS assignments_order_id_idx
  ON public.assignments ("orderId");
CREATE INDEX IF NOT EXISTS assignments_ended_by_order_id_idx
  ON public.assignments ("endedByOrderId");
CREATE INDEX IF NOT EXISTS assignments_related_order_ids_idx
  ON public.assignments USING GIN ("relatedOrderIds");

-- Link old text references only when they identify exactly one order.
-- Ambiguous and unmatched references are left unchanged for manual review.
WITH unique_legacy_matches AS (
  SELECT a.id AS assignment_id, MIN(o.id) AS order_id
  FROM public.assignments AS a
  JOIN public.orders AS o
    ON LOWER(BTRIM(a."orderRef")) = LOWER(BTRIM(o.id))
    OR LOWER(BTRIM(a."orderRef")) = LOWER(BTRIM(o."orderNumber"))
  WHERE COALESCE(BTRIM(a."orderId"), '') = ''
    AND COALESCE(BTRIM(a."orderRef"), '') <> ''
  GROUP BY a.id
  HAVING COUNT(DISTINCT o.id) = 1
)
UPDATE public.assignments AS a
SET "orderId" = matches.order_id,
    "relatedOrderIds" = ARRAY[matches.order_id]
FROM unique_legacy_matches AS matches
WHERE a.id = matches.assignment_id;
