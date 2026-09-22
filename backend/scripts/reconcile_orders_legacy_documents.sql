-- Phase 9/10: reconcile legacy DOCX metadata after
-- migrate_orders_document_schema.sql has been applied.
-- This script is intentionally non-destructive: legacy columns remain available
-- until the final compatibility-removal release.

UPDATE public.orders
SET "generatedDocument" = jsonb_build_object(
  'fileName', "fileName",
  'fileMimeType', "fileMimeType",
  'fileSize', "fileSize",
  'storagePath', "storagePath",
  'version', GREATEST(COALESCE("documentVersion", 0), 1),
  'generatedAt', "documentUploadedAt",
  'legacySource', true
)
WHERE "generatedDocument" IS NULL
  AND "storagePath" IS NOT NULL
  AND lower(COALESCE("fileMimeType", '')) = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

UPDATE public.orders
SET "templateKey" = COALESCE("templateKey", 'legacy-docx'),
    "templateVersion" = COALESCE("templateVersion", 'legacy')
WHERE "generatedDocument" IS NOT NULL
  AND "generatedDocument"->>'legacySource' = 'true';

-- Review any records that incorrectly contain a DOCX in signedDocument before
-- changing them. The cleanup is deliberately a report, not an automatic delete.
SELECT id, "orderNumber", "signedDocument"->>'fileName' AS signed_file_name,
       "signedDocument"->>'fileMimeType' AS signed_file_mime_type
FROM public.orders
WHERE lower(COALESCE("signedDocument"->>'fileMimeType', '')) =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
