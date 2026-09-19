-- ============================================================
-- PAIS 2.0 EXCEL WORKSHEET MODULE MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS worksheet_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  col_count INTEGER NOT NULL DEFAULT 0,
  views JSONB DEFAULT '[]'::jsonb,
  merges JSONB DEFAULT '[]'::jsonb,
  column_config JSONB DEFAULT '{}'::jsonb,
  row_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worksheet_cell_overrides (
  id TEXT PRIMARY KEY,
  worksheet_id TEXT NOT NULL,
  cell_address TEXT NOT NULL,
  value TEXT,
  formula TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worksheet_audit_logs (
  id TEXT PRIMARY KEY,
  worksheet_id TEXT NOT NULL,
  worksheet_name TEXT NOT NULL,
  cell_address TEXT NOT NULL,
  personnel_id TEXT,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  action TEXT NOT NULL DEFAULT 'UPDATE_CELL',
  modified_by TEXT NOT NULL DEFAULT 'System User',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worksheet_audit_logs_time ON worksheet_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_worksheet_cell_overrides_sheet ON worksheet_cell_overrides(worksheet_id, cell_address);
