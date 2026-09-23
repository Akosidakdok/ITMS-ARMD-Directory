-- Phase 4: controlled order workflow and status history.
-- Run after migrate_orders_phase1.sql and migrate_orders_phase2.sql.

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id text PRIMARY KEY,
  "orderId" text NOT NULL,
  "fromStatus" text,
  "toStatus" text NOT NULL,
  reason text,
  "changedBy" text,
  "changedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx
  ON public.order_status_history ("orderId", "changedAt" DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_status_history_select_authenticated" ON public.order_status_history;
CREATE POLICY "order_status_history_select_authenticated"
  ON public.order_status_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "order_status_history_insert_authenticated" ON public.order_status_history;
CREATE POLICY "order_status_history_insert_authenticated"
  ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (true);
