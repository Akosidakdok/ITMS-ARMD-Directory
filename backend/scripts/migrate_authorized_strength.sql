-- Phase 5: controlled authorized-strength baseline.
-- Actual strength remains derived from PAIS personnel records.
create table if not exists public.authorized_strengths (
  id text primary key,
  "reportType" text not null,
  "unitKey" text not null default '',
  "rankKey" text not null default '',
  "authorizedStrength" integer not null check ("authorizedStrength" >= 0),
  "asOfDate" date,
  "updatedBy" text,
  "updatedAt" timestamptz not null default now(),
  unique ("reportType", "unitKey", "rankKey")
);

create index if not exists authorized_strengths_report_lookup
  on public.authorized_strengths ("reportType", "asOfDate");

alter table public.authorized_strengths enable row level security;
drop policy if exists authorized_strengths_service_role on public.authorized_strengths;
create policy authorized_strengths_service_role on public.authorized_strengths
  for all to service_role using (true) with check (true);
