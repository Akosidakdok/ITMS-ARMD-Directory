-- Promotion evaluation snapshots. Point values remain configurable in the API
-- calculation and are intentionally not assumed by this migration.
create table if not exists public.promotion_evaluations (
  id text primary key,
  "personnelId" text not null,
  "evaluationDate" date not null,
  status text not null default 'Draft' check (status in ('Draft', 'For Review', 'Approved', 'Rejected')),
  evaluator text,
  remarks text,
  calculation jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists promotion_evaluations_personnel_idx on public.promotion_evaluations ("personnelId");
create index if not exists promotion_evaluations_date_idx on public.promotion_evaluations ("evaluationDate" desc);
alter table public.promotion_evaluations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'promotion_evaluations' and policyname = 'PAIS can read promotion evaluations') then
    create policy "PAIS can read promotion evaluations" on public.promotion_evaluations for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'promotion_evaluations' and policyname = 'PAIS can insert promotion evaluations') then
    create policy "PAIS can insert promotion evaluations" on public.promotion_evaluations for insert to anon, authenticated with check (length(trim("personnelId")) > 0);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'promotion_evaluations' and policyname = 'PAIS can update promotion evaluations') then
    create policy "PAIS can update promotion evaluations" on public.promotion_evaluations for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
