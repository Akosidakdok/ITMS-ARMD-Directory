-- Atomic official order issuance and sequence reconciliation.
-- Run after the existing Orders Phases 1-6 migrations and the legacy Awards
-- migration if that migration is part of this database setup.

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_sequences (
  "year" INTEGER NOT NULL,
  series TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("year", series)
);

LOCK TABLE public.order_sequences IN EXCLUSIVE MODE;

-- Reconcile each year/series counter to the greatest valid number already
-- issued. Purpose codes share a sequence within the same series and year.
INSERT INTO public.order_sequences ("year", series, last_number)
SELECT
  (parts[3])::INTEGER AS "year",
  parts[1] AS series,
  MAX((parts[4])::INTEGER) AS last_number
FROM public.orders
CROSS JOIN LATERAL regexp_matches(
  "orderNumber",
  '^ITMS-(GO|SO|LO)-([A-Z0-9]+)-([0-9]{4})-([0-9]+)$'
) AS parts
GROUP BY parts[1], parts[3]
ON CONFLICT ("year", series) DO UPDATE
SET last_number = GREATEST(public.order_sequences.last_number, EXCLUDED.last_number);

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx
  ON public.orders ("orderNumber");

-- Remove legacy order-number triggers that still call the counter-only RPC.
-- Official issuance now allocates the number and inserts the order inside
-- issue_itms_order, so a trigger using next_itms_order_sequence is redundant
-- and conflicts with its revoked client grants.
DO $$
DECLARE
  legacy_trigger RECORD;
BEGIN
  FOR legacy_trigger IN
    SELECT
      trigger_schema.nspname AS table_schema,
      target_table.relname AS table_name,
      order_trigger.tgname AS trigger_name
    FROM pg_trigger AS order_trigger
    JOIN pg_class AS target_table ON target_table.oid = order_trigger.tgrelid
    JOIN pg_namespace AS trigger_schema ON trigger_schema.oid = target_table.relnamespace
    WHERE NOT order_trigger.tgisinternal
      AND trigger_schema.nspname = 'public'
      AND target_table.relname = 'orders'
      AND pg_get_functiondef(order_trigger.tgfoid) ILIKE '%next_itms_order_sequence%'
  LOOP
    EXECUTE format(
      'DROP TRIGGER %I ON %I.%I',
      legacy_trigger.trigger_name,
      legacy_trigger.table_schema,
      legacy_trigger.table_name
    );
  END LOOP;
END;
$$;

-- Allocation and insert happen in the same PostgreSQL transaction. If the
-- order insert fails, the counter increment rolls back with it.
CREATE OR REPLACE FUNCTION public.issue_itms_order(p_order JSONB)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_series TEXT;
  v_purpose TEXT;
  v_issued_date DATE;
  v_year INTEGER;
  v_sequence INTEGER;
  v_order_number TEXT;
  v_order_json JSONB;
  v_inserted public.orders%ROWTYPE;
BEGIN
  IF p_order IS NULL OR jsonb_typeof(p_order) <> 'object' THEN
    RAISE EXCEPTION 'Order payload must be a JSON object.';
  END IF;

  v_series := upper(btrim(p_order->>'series'));
  v_purpose := upper(btrim(p_order->>'purposeCode'));
  IF v_series IS NULL OR v_series NOT IN ('GO', 'SO', 'LO') THEN
    RAISE EXCEPTION 'Invalid order series. Use GO, SO, or LO.';
  END IF;
  IF v_purpose IS NULL OR v_purpose !~ '^[A-Z0-9]{2,8}$' THEN
    RAISE EXCEPTION 'Invalid order purpose code.';
  END IF;
  IF COALESCE(btrim(p_order->>'id'), '') = ''
    OR COALESCE(btrim(p_order->>'orderType'), '') = ''
    OR COALESCE(btrim(p_order->>'subject'), '') = '' THEN
    RAISE EXCEPTION 'Order id, order type, and subject are required.';
  END IF;

  BEGIN
    v_issued_date := NULLIF(btrim(p_order->>'issuedDate'), '')::DATE;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'A valid issued date is required to generate the order number.';
  END;
  IF v_issued_date IS NULL THEN
    RAISE EXCEPTION 'A valid issued date is required to generate the order number.';
  END IF;

  v_year := EXTRACT(YEAR FROM v_issued_date)::INTEGER;
  IF v_year < 2000 OR v_year > 3000 THEN
    RAISE EXCEPTION 'Invalid order year: %', v_year;
  END IF;

  -- Return a prior result if the client retries after a lost response. This
  -- keeps retries idempotent and does not allocate a second number.
  SELECT * INTO v_inserted
  FROM public.orders
  WHERE id = p_order->>'id';
  IF FOUND THEN
    IF v_inserted.series IS DISTINCT FROM v_series
      OR v_inserted."purposeCode" IS DISTINCT FROM v_purpose
      OR v_inserted."issuedDate" IS DISTINCT FROM v_issued_date
      OR v_inserted.subject IS DISTINCT FROM p_order->>'subject' THEN
      RAISE EXCEPTION 'Order id already exists with different issuance details.';
    END IF;
    RETURN NEXT v_inserted;
    RETURN;
  END IF;

  INSERT INTO public.order_sequences ("year", series, last_number)
  VALUES (v_year, v_series, 1)
  ON CONFLICT ("year", series) DO UPDATE
    SET last_number = public.order_sequences.last_number + 1
  RETURNING last_number INTO v_sequence;

  v_order_number := format(
    'ITMS-%s-%s-%s-%s',
    v_series,
    v_purpose,
    v_year,
    CASE WHEN v_sequence < 10000 THEN lpad(v_sequence::TEXT, 4, '0') ELSE v_sequence::TEXT END
  );

  -- Apply table defaults explicitly because jsonb_populate_record supplies
  -- NULL for columns omitted from the JSON object.
  v_order_json := (p_order - 'orderNo' - 'issuancePending') || jsonb_build_object(
    'series', v_series,
    'purposeCode', v_purpose,
    'issuedDate', v_issued_date,
    'orderNumber', v_order_number,
    'personnelIds', COALESCE(p_order->'personnelIds', '[]'::JSONB),
    'createdAt', now(),
    'updatedAt', now(),
    'documentVersion', 0,
    'isDeleted', false,
    'orderEffectHistory', '[]'::JSONB,
    'status', COALESCE(p_order->'status', '"Draft"'::JSONB),
    'affectedPersonnelCount', COALESCE(p_order->'affectedPersonnelCount', '1'::JSONB)
  );

  INSERT INTO public.orders
  SELECT (jsonb_populate_record(NULL::public.orders, v_order_json)).*
  RETURNING * INTO v_inserted;

  RETURN NEXT v_inserted;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_itms_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_itms_order(JSONB) TO anon, authenticated, service_role;

-- The previous counter-only RPC is no longer used by the application. Remove
-- its execute grants to prevent counters being advanced without an order row.
REVOKE ALL ON FUNCTION public.next_itms_order_sequence(INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_itms_order_sequence(INTEGER, TEXT) FROM anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
