-- Adds Promotions persistence, foreign keys, and indexes used by PAIS 2.0 Promotions Module.
-- Safe to run multiple times in the Supabase SQL editor.

create table if not exists public.promotions (
  id text primary key,
  "personnelId" text not null,
  "rankFrom" text not null,
  "rankTo" text not null,
  "promotionDate" date not null,
  "orderNumber" text not null,
  "authority" text,
  "timeInGradeAtPromotion" text,
  "remarks" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Index by personnelId for fast lookup during profile rendering and synchronization
create index if not exists promotions_personnel_id_idx
  on public.promotions ("personnelId");

-- Index by promotionDate for chronological ordering and TIG audit logs
create index if not exists promotions_date_idx
  on public.promotions ("promotionDate" desc);

alter table public.promotions enable row level security;

-- Read policy for anon and authenticated users
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'promotions'
      and policyname = 'PAIS can read promotions'
  ) then
    create policy "PAIS can read promotions"
      on public.promotions
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'promotions'
      and policyname = 'PAIS can insert promotions'
  ) then
    create policy "PAIS can insert promotions"
      on public.promotions
      for insert
      to anon, authenticated
      with check (
        length(trim("personnelId")) > 0
        and length(trim("rankFrom")) > 0
        and length(trim("rankTo")) > 0
        and "promotionDate" is not null
        and length(trim("orderNumber")) > 0
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'promotions'
      and policyname = 'PAIS can update promotions'
  ) then
    create policy "PAIS can update promotions"
      on public.promotions
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'promotions'
      and policyname = 'PAIS can delete promotions'
  ) then
    create policy "PAIS can delete promotions"
      on public.promotions
      for delete
      to anon, authenticated
      using (true);
  end if;
end $$;
