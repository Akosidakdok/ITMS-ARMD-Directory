-- ============================================================
-- PAIS 2.0 DOCUMENT EDITOR MODULE MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'Administrative Order',
  content_json JSONB DEFAULT '{}'::jsonb,
  content_html TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  page_size TEXT NOT NULL DEFAULT 'A4',
  orientation TEXT NOT NULL DEFAULT 'portrait',
  margin_top NUMERIC NOT NULL DEFAULT 25.4,
  margin_bottom NUMERIC NOT NULL DEFAULT 25.4,
  margin_left NUMERIC NOT NULL DEFAULT 25.4,
  margin_right NUMERIC NOT NULL DEFAULT 25.4,
  created_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'Administrative Order',
  content_json JSONB DEFAULT '{}'::jsonb,
  content_html TEXT,
  template_id TEXT,
  owner_id TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  version INTEGER NOT NULL DEFAULT 1,
  page_size TEXT NOT NULL DEFAULT 'A4',
  orientation TEXT NOT NULL DEFAULT 'portrait',
  margin_top NUMERIC NOT NULL DEFAULT 25.4,
  margin_bottom NUMERIC NOT NULL DEFAULT 25.4,
  margin_left NUMERIC NOT NULL DEFAULT 25.4,
  margin_right NUMERIC NOT NULL DEFAULT 25.4,
  order_id TEXT,
  personnel_ids JSONB DEFAULT '[]'::jsonb,
  created_by TEXT NOT NULL DEFAULT 'System',
  updated_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_json JSONB DEFAULT '{}'::jsonb,
  content_html TEXT,
  created_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_id ON document_versions(document_id, version_number DESC);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Service role manages documents') THEN
    CREATE POLICY "Service role manages documents" ON documents FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_templates' AND policyname = 'Service role manages document_templates') THEN
    CREATE POLICY "Service role manages document_templates" ON document_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_versions' AND policyname = 'Service role manages document_versions') THEN
    CREATE POLICY "Service role manages document_versions" ON document_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
