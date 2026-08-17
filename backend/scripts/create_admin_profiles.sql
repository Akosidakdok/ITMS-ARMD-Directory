create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  division text not null default 'ARMD',
  role text not null check (role in ('admin', 'superadmin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

create index if not exists admin_profiles_role_idx on public.admin_profiles(role);
create index if not exists admin_profiles_status_idx on public.admin_profiles(status);

comment on table public.admin_profiles is 'Application profiles for Supabase Auth administrators and superadmins. Accessed only by the service-role backend.';
