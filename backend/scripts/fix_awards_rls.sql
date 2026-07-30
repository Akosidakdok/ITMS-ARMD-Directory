-- Run this once in Supabase SQL Editor when the awards table already exists.
-- It allows the current PAIS Express backend to read and insert Award records.
-- Update and delete operations remain blocked.

alter table public.awards enable row level security;

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
