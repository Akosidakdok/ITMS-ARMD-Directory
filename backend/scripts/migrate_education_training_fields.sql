-- Creates or upgrades the tables used by Academic Attainment and Specialized
-- IT Training. Safe to run more than once in the Supabase SQL editor.

create table if not exists public.education (
  id text primary key,
  "personnelId" text not null,
  "academicLevel" text,
  degree text,
  institution text,
  major text,
  "startYear" integer,
  "yearGraduated" integer,
  honors text,
  highest boolean not null default false,
  ranking integer,
  certifications text[] default array[]::text[],
  "createdBy" text,
  "createdOn" timestamptz not null default now(),
  "modifiedBy" text,
  "modifiedOn" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Also upgrades older versions of the education table.
alter table public.education add column if not exists "personnelId" text;
alter table public.education add column if not exists "academicLevel" text;
alter table public.education add column if not exists degree text;
alter table public.education add column if not exists institution text;
alter table public.education add column if not exists major text;
alter table public.education add column if not exists "startYear" integer;
alter table public.education add column if not exists "yearGraduated" integer;
alter table public.education add column if not exists honors text;
alter table public.education add column if not exists highest boolean not null default false;
alter table public.education add column if not exists ranking integer;
alter table public.education add column if not exists certifications text[] default array[]::text[];
alter table public.education add column if not exists "createdBy" text;
alter table public.education add column if not exists "createdOn" timestamptz not null default now();
alter table public.education add column if not exists "modifiedBy" text;
alter table public.education add column if not exists "modifiedOn" timestamptz;
alter table public.education add column if not exists "createdAt" timestamptz not null default now();
alter table public.education add column if not exists "updatedAt" timestamptz not null default now();

-- Lower academic levels may legitimately have no course, major, or school.
alter table public.education alter column degree drop not null;
alter table public.education alter column institution drop not null;

create index if not exists education_personnel_id_idx
  on public.education ("personnelId");

create index if not exists education_level_idx
  on public.education ("academicLevel");

create table if not exists public.training (
  id text primary key,
  "personnelId" text not null,
  "courseName" text not null,
  category text,
  provider text,
  location text,
  "startDate" text,
  "completionDate" text,
  hours numeric,
  source text,
  "certificateNo" text,
  "authorityDate" text,
  "issuedBy" text,
  attachment text,
  "createdBy" text,
  "createdOn" timestamptz not null default now(),
  "modifiedBy" text,
  "modifiedOn" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Also upgrades older versions of the training table.
alter table public.training add column if not exists "personnelId" text;
alter table public.training add column if not exists "courseName" text;
alter table public.training add column if not exists category text;
alter table public.training add column if not exists provider text;
alter table public.training add column if not exists location text;
alter table public.training add column if not exists "startDate" text;
alter table public.training add column if not exists "completionDate" text;
alter table public.training add column if not exists hours numeric;
alter table public.training add column if not exists source text;
alter table public.training add column if not exists "certificateNo" text;
alter table public.training add column if not exists "authorityDate" text;
alter table public.training add column if not exists "issuedBy" text;
alter table public.training add column if not exists attachment text;
alter table public.training add column if not exists "createdBy" text;
alter table public.training add column if not exists "createdOn" timestamptz not null default now();
alter table public.training add column if not exists "modifiedBy" text;
alter table public.training add column if not exists "modifiedOn" timestamptz;
alter table public.training add column if not exists "createdAt" timestamptz not null default now();
alter table public.training add column if not exists "updatedAt" timestamptz not null default now();

create index if not exists training_personnel_id_idx
  on public.training ("personnelId");

create index if not exists training_start_date_idx
  on public.training ("startDate");

-- The Express backend uses the service-role credential for database access.
-- RLS therefore remains enabled without exposing these records to anon clients.
alter table public.education enable row level security;
alter table public.training enable row level security;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('education', 'training')
order by table_name, ordinal_position;
