-- Phase 3: separate generated-order and signed-scan metadata.
-- Run after the existing order migrations and
-- migrate_orders_personnel_involvement.sql.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "generatedDocument" jsonb,
  ADD COLUMN IF NOT EXISTS "signedDocument" jsonb,
  ADD COLUMN IF NOT EXISTS "generationManifest" jsonb,
  ADD COLUMN IF NOT EXISTS "templateKey" text,
  ADD COLUMN IF NOT EXISTS "templateVersion" text;

-- Existing DOCX uploads are generated/source documents, not signed scans.
-- Keep the original legacy columns intact during the transition.
UPDATE public.orders
SET "generatedDocument" = jsonb_build_object(
  'fileName', "fileName",
  'fileMimeType', "fileMimeType",
  'fileSize', "fileSize",
  'storagePath', "storagePath",
  'version', GREATEST(COALESCE("documentVersion", 0), 1),
  'generatedAt', "documentUploadedAt"
)
WHERE "generatedDocument" IS NULL
  AND "storagePath" IS NOT NULL
  AND (
    lower(COALESCE("fileMimeType", '')) = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    OR lower(COALESCE("fileName", '')) LIKE '%.docx'
  );

CREATE INDEX IF NOT EXISTS orders_generated_document_gin_idx
  ON public.orders USING gin ("generatedDocument");

CREATE INDEX IF NOT EXISTS orders_signed_document_gin_idx
  ON public.orders USING gin ("signedDocument");

CREATE INDEX IF NOT EXISTS orders_template_key_idx
  ON public.orders ("templateKey");
