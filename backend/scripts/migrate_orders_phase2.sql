-- Orders Phase 2: atomic automated order-number generation.
-- Run migrate_orders_phase1.sql first, then run this script.

CREATE TABLE IF NOT EXISTS public.order_sequences (
  "year" INTEGER NOT NULL,
  series TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("year", series)
);

-- Seed the sequence table from any existing numbers that already follow the
-- ITMS-{SERIES}-{PURPOSE}-{YEAR}-{NUMBER} format.
INSERT INTO public.order_sequences ("year", series, last_number)
SELECT
  (parts[2])::INTEGER AS "year",
  parts[1] AS series,
  MAX((parts[3])::INTEGER) AS last_number
FROM public.orders
CROSS JOIN LATERAL regexp_matches(
  "orderNumber",
  '^ITMS-(GO|SO|LO)-[A-Z0-9]+-([0-9]{4})-([0-9]+)$'
) AS parts
GROUP BY parts[1], parts[2]
ON CONFLICT ("year", series) DO UPDATE
SET last_number = GREATEST(public.order_sequences.last_number, EXCLUDED.last_number);

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx
  ON public.orders ("orderNumber");

-- This function performs the increment atomically inside PostgreSQL. The
-- backend then combines the returned sequence with the selected purpose code.
CREATE OR REPLACE FUNCTION public.next_itms_order_sequence(
  p_year INTEGER,
  p_series TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  IF p_year < 2000 OR p_year > 3000 THEN
    RAISE EXCEPTION 'Invalid order year: %', p_year;
  END IF;

  IF p_series NOT IN ('GO', 'SO', 'LO') THEN
    RAISE EXCEPTION 'Invalid order series: %', p_series;
  END IF;

  INSERT INTO public.order_sequences ("year", series, last_number)
  VALUES (p_year, p_series, 1)
  ON CONFLICT ("year", series) DO UPDATE
    SET last_number = public.order_sequences.last_number + 1
  RETURNING last_number INTO next_number;

  RETURN next_number;
END;
$$;

REVOKE ALL ON FUNCTION public.next_itms_order_sequence(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_itms_order_sequence(INTEGER, TEXT) TO anon, authenticated, service_role;
