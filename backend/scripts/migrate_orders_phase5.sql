-- Phase 5: private DOCX document storage metadata.
-- Run after migrate_orders_phase1.sql, migrate_orders_phase2.sql, and migrate_orders_phase4.sql.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "fileName" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "fileMimeType" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "fileSize" bigint;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "storagePath" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "documentVersion" integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "documentUploadedAt" timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-documents', 'order-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Do not ALTER storage.objects or create policies on it here. Supabase owns
-- that managed table. The backend uses SUPABASE_SERVICE_ROLE_KEY and creates
-- short-lived signed URLs, so storage access remains private and server-side.
