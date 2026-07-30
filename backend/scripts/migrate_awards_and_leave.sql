-- Adds Award persistence and indexes used by the All Orders module.
-- Safe to run more than once in the Supabase SQL editor.

create table if not exists public.awards (
  id text primary key,
  "orderType" text not null check ("orderType" in ('General Order', 'Special Order', 'Letter Order')),
  title text not null,
  "citationDetails" text not null,
  "awardName" text not null,
  "authorityDate" date not null,
  "personnelId" text not null,
  "personnelName" text not null,
  status text not null default 'Active',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists awards_personnel_id_idx
  on public.awards ("personnelId");

create index if not exists awards_authority_date_idx
  on public.awards ("authorityDate");

alter table public.awards enable row level security;

-- The current Express backend uses the project's publishable Supabase key.
-- Permit only the operations implemented by the Award module. Updates and
-- deletes remain blocked until authenticated authorization is added.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'awards'
      and policyname = 'PAIS can read awards'
  ) then
    create policy "PAIS can read awards"
      on public.awards
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'awards'
      and policyname = 'PAIS can insert awards'
  ) then
    create policy "PAIS can insert awards"
      on public.awards
      for insert
      to anon, authenticated
      with check (
        "orderType" in ('General Order', 'Special Order', 'Letter Order')
        and status = 'Active'
        and length(trim(title)) > 0
        and length(trim("awardName")) > 0
        and length(trim("personnelId")) > 0
      );
  end if;
end
$$;

do $$
begin
  if to_regclass('public.leave') is not null then
    create index if not exists leave_date_range_idx
      on public.leave ("startDate", "endDate");
  end if;
end
$$;
