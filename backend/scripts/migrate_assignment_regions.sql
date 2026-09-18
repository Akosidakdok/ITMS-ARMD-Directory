-- Adds the explicit geography input required by diversity-of-assignment calculations.
alter table if exists public.assignments
  add column if not exists region text;

create index if not exists assignments_region_idx
  on public.assignments (region);
