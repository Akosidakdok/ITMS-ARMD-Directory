-- Durable Excel export/import audit history.
create table if not exists public.excel_import_audits (
  id text primary key,
  "templateId" text not null,
  "templateVersion" text not null,
  "exportId" text,
  "uploadedFilename" text,
  "uploadedBy" text not null,
  "approvedBy" text,
  status text not null check (status in ('Previewed', 'Committed', 'Rejected', 'Failed')),
  "rowCount" integer not null default 0,
  "validCount" integer not null default 0,
  "invalidCount" integer not null default 0,
  "addedCount" integer not null default 0,
  "replacedCount" integer not null default 0,
  "skippedCount" integer not null default 0,
  "sourceFingerprint" text,
  "fileHash" text,
  details jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "approvedAt" timestamptz
);

create index if not exists excel_import_audits_created_idx on public.excel_import_audits ("createdAt" desc);
create index if not exists excel_import_audits_template_idx on public.excel_import_audits ("templateId");
alter table public.excel_import_audits enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'excel_import_audits' and policyname = 'PAIS service role manages Excel import audits') then
    create policy "PAIS service role manages Excel import audits" on public.excel_import_audits for all to service_role using (true) with check (true);
  end if;
end $$;
