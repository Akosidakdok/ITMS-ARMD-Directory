-- Move standalone Award records into the Administrative Orders register.
-- Run in the Supabase SQL Editor after the Orders Phases 1-6 and Awards table migrations.
-- This is safe to re-run: purposeData.legacyAwardId prevents duplicate copies.
-- Source rows remain in public.awards as a backup; the application no longer
-- reads or creates standalone Award records.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "purposeData" jsonb,
  ADD COLUMN IF NOT EXISTS "personnelInvolvement" jsonb,
  ADD COLUMN IF NOT EXISTS "personnelSnapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "generatedDocument" jsonb,
  ADD COLUMN IF NOT EXISTS "signedDocument" jsonb,
  ADD COLUMN IF NOT EXISTS "generationManifest" jsonb,
  ADD COLUMN IF NOT EXISTS "templateKey" text,
  ADD COLUMN IF NOT EXISTS "templateVersion" text;

-- Keep imported numbers in sync with the same per-series/per-year sequence
-- used by new Administrative Orders.
CREATE TABLE IF NOT EXISTS public.order_sequences (
  "year" integer NOT NULL,
  series text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("year", series)
);

LOCK TABLE public.order_sequences IN EXCLUSIVE MODE;

INSERT INTO public.order_sequences ("year", series, last_number)
SELECT
  (parts[2])::integer AS "year",
  parts[1] AS series,
  MAX((parts[3])::integer) AS last_number
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

WITH source_awards AS (
  SELECT
    a.id AS source_id,
    a."personnelId" AS personnel_id,
    a."personnelName" AS personnel_name,
    COALESCE(NULLIF(BTRIM(a."awardName"), ''), a.title) AS subject,
    a.title AS award_title,
    a."citationDetails" AS citation,
    a."authorityDate"::date AS authority_date,
    COALESCE(a."createdAt", NOW()) AS created_at,
    CASE a."orderType"
      WHEN 'General Order' THEN 'GO'
      WHEN 'Letter Order' THEN 'LO'
      ELSE 'SO'
    END AS series
  FROM public.awards a
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.orders existing
    WHERE existing.id = 'legacy-award-' || a.id
       OR existing."purposeData"->>'legacyAwardId' = a.id
  )
), numbered_awards AS (
  SELECT
    source_awards.*,
    EXTRACT(YEAR FROM source_awards.authority_date)::integer AS issue_year,
    ROW_NUMBER() OVER (
      PARTITION BY source_awards.series, EXTRACT(YEAR FROM source_awards.authority_date)
      ORDER BY source_awards.authority_date, source_awards.source_id
    ) + COALESCE(sequence.last_number, 0) AS sequence_number
  FROM source_awards
  LEFT JOIN public.order_sequences sequence
    ON sequence."year" = EXTRACT(YEAR FROM source_awards.authority_date)::integer
   AND sequence.series = source_awards.series
), inserted_awards AS (
  INSERT INTO public.orders (
    id,
    "personnelIds",
    "orderNumber",
    "orderType",
    subject,
    description,
    issuer,
    "issuedDate",
    "effectiveDate",
    type,
    signatory,
    "signatoryTitle",
    "affectedPersonnelCount",
    status,
    series,
    "purposeCode",
    "purposeLabel",
    "documentStatus",
    "createdAt",
    "updatedAt",
    "purposeData",
    "personnelInvolvement",
    "personnelSnapshot"
  )
  SELECT
    'legacy-award-' || award.source_id,
    ARRAY[award.personnel_id]::text[],
    FORMAT('ITMS-%s-AW-%s-%s', award.series, award.issue_year, LPAD(award.sequence_number::text, 4, '0')),
    FORMAT('%s — AW — Award', award.series),
    award.subject,
    '',
    'ITMS',
    award.authority_date,
    award.authority_date,
    'Award',
    'PBGEN BENJAMIN H ACORDA',
    'Director, ITMS',
    1,
    'Draft',
    award.series,
    'AW',
    'AW — Award',
    'Draft',
    award.created_at,
    NOW(),
    JSONB_BUILD_OBJECT(
      'awardTitle', award.award_title,
      'citation', award.citation,
      'legacyAwardId', award.source_id
    ),
    JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT(
      'personnelId', award.personnel_id,
      'role', 'recipient',
      'sequence', 1
    )),
    JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT(
      'personnelId', award.personnel_id,
      'role', 'recipient',
      'sequence', 1,
      'rank', COALESCE(NULLIF(TO_JSONB(person)->>'rank', ''), ''),
      'fullName', COALESCE(
        NULLIF(TO_JSONB(person)->>'fullName', ''),
        NULLIF(BTRIM(award.personnel_name), ''),
        ''
      ),
      'badgeNo', COALESCE(NULLIF(TO_JSONB(person)->>'badgeNo', ''), ''),
      'unit', COALESCE(
        NULLIF(TO_JSONB(person)->>'sub_unit', ''),
        NULLIF(TO_JSONB(person)->>'division', ''),
        NULLIF(TO_JSONB(person)->>'unitCategory', ''),
        ''
      ),
      'designation', COALESCE(NULLIF(TO_JSONB(person)->>'designation', ''), '')
    ))
  FROM numbered_awards award
  LEFT JOIN public.personnel person ON person.id::text = award.personnel_id
  RETURNING series, "issuedDate", "orderNumber"
)
INSERT INTO public.order_sequences ("year", series, last_number)
SELECT
  EXTRACT(YEAR FROM "issuedDate")::integer,
  series,
  MAX(SPLIT_PART("orderNumber", '-', 5)::integer)
FROM inserted_awards
GROUP BY EXTRACT(YEAR FROM "issuedDate")::integer, series
ON CONFLICT ("year", series) DO UPDATE
SET last_number = GREATEST(public.order_sequences.last_number, EXCLUDED.last_number);

COMMIT;
