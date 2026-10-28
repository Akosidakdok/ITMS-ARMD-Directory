-- DLOS Encoder NSU Terminal. Run in Supabase SQL Editor before enabling the module.
-- Case dates use PostgreSQL DATE; case identifiers and docket numbers remain text.
create extension if not exists pgcrypto;

create table if not exists public.dlos_user_access (
  "userId" uuid primary key references auth.users(id) on delete cascade,
  "accessRole" text not null check ("accessRole" in ('viewer', 'encoder', 'reviewer')),
  active boolean not null default true,
  "grantedByUserId" uuid,
  "grantedAt" timestamptz not null default now(),
  "revokedByUserId" uuid,
  "revokedAt" timestamptz,
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.dlos_access_events (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null,
  "actorUserId" uuid,
  action text not null check (action in ('grant', 'change_role', 'revoke')),
  "accessRole" text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.dlos_cases (
  id uuid primary key default gen_random_uuid(),
  classification text not null check (classification in ('grave', 'less_grave')),
  "caseDate" date not null,
  "docketNumber" text not null check (length(trim("docketNumber")) > 0),
  "didmNsuDocketNumber" text not null default '',
  "didmReferenceNumber" text not null default '',
  "summaryHearingDocketNumber" text not null default '',
  "presidentialConfirmation" text not null default 'not_applicable'
    check ("presidentialConfirmation" in ('not_applicable', 'pending', 'confirmed', 'not_confirmed')),
  "unitOfficeCaseFrom" text not null default '',
  "caseSource" text not null default '',
  "caseStatus" text not null default 'For Updating by DLOS Encoder'
    check (length(trim("caseStatus")) > 0),
  "complaintDate" date,
  "forwardedToDlodDate" date,
  "shoName" text not null default '',
  "receivedByShoDate" date,
  "resolvedByShoDate" date,
  "decisionIssuedDate" date,
  "sourceSystem" text not null default '',
  "sourceRecordId" text not null default '',
  "encodedByUserId" uuid not null,
  "encoderName" text not null,
  "createdByUserId" uuid not null,
  "updatedByUserId" uuid not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  "archivedAt" timestamptz,
  "archivedByUserId" uuid
);

alter table public.dlos_cases add column if not exists "signedByDaDate" date;
alter table public.dlos_cases add column if not exists "dlodDocketNumber" text not null default '';
alter table public.dlos_cases add column if not exists "complaintSource" text not null default '';
alter table public.dlos_cases add column if not exists "initialComplaint" text not null default '';
alter table public.dlos_cases add column if not exists "occurrenceAt" timestamp without time zone;
alter table public.dlos_cases add column if not exists "occurrencePlace" text not null default '';
alter table public.dlos_cases add column if not exists "complaintDetails" text not null default '';

create table if not exists public.dlos_case_personnel (
  id uuid primary key default gen_random_uuid(),
  "caseId" uuid not null references public.dlos_cases(id) on delete cascade,
  "personnelId" text,
  role text not null default 'involved' check (role in ('involved', 'complainant', 'respondent')),
  rank text not null default '',
  "firstName" text not null default '',
  "middleName" text not null default '',
  "lastName" text not null default '',
  "nameSnapshot" text not null check (length(trim("nameSnapshot")) > 0),
  position integer not null default 0
);

alter table public.dlos_case_personnel drop constraint if exists dlos_case_personnel_role_check;
alter table public.dlos_case_personnel add constraint dlos_case_personnel_role_check
  check (role in ('involved', 'complainant', 'respondent', 'witness'));
alter table public.dlos_case_personnel add column if not exists unit text not null default '';
alter table public.dlos_case_personnel add column if not exists status text not null default '';

create table if not exists public.dlos_case_events (
  id uuid primary key default gen_random_uuid(),
  "caseId" uuid not null references public.dlos_cases(id) on delete cascade,
  "eventType" text not null,
  "changedFields" text[] not null default '{}',
  "fromStatus" text,
  "toStatus" text,
  "actorUserId" uuid not null,
  "actorName" text not null,
  reason text not null default '',
  "createdAt" timestamptz not null default now()
);

create table if not exists public.dlos_case_updates (
  id uuid primary key default gen_random_uuid(),
  "caseId" uuid not null references public.dlos_cases(id) on delete cascade,
  "updateDate" date not null,
  note text not null check (length(trim(note)) between 1 and 2000),
  "actorUserId" uuid not null,
  "actorName" text not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.dlos_case_documents (
  id uuid primary key default gen_random_uuid(),
  "caseId" uuid not null references public.dlos_cases(id) on delete cascade,
  kind text not null check (kind in ('transmittal', 'pce')),
  "fileName" text not null,
  "mimeType" text not null check ("mimeType" in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  "fileSize" integer not null check ("fileSize" between 1 and 10485760),
  "storagePath" text not null unique,
  "uploadedByUserId" uuid not null,
  "uploaderName" text not null,
  "uploadedAt" timestamptz not null default now()
);

alter table public.dlos_case_documents drop constraint if exists dlos_case_documents_kind_check;
alter table public.dlos_case_documents add constraint dlos_case_documents_kind_check
  check (kind in ('transmittal', 'pce', 'workflow', 'sho_memorandum'));
alter table public.dlos_case_documents add column if not exists "documentDate" date;
alter table public.dlos_case_documents add column if not exists "stepKey" text not null default '';
alter table public.dlos_case_documents add column if not exists "fileRole" text not null default '';
alter table public.dlos_case_documents add column if not exists "respondentKey" text not null default '';

create table if not exists public.dlos_case_workflow (
  id uuid primary key default gen_random_uuid(),
  "caseId" uuid not null references public.dlos_cases(id) on delete cascade,
  "stepKey" text not null check ("stepKey" in ('roi', 'resolution', 'decision', 'decision_resolution',
    'decision_service', 'mr_resolution', 'mr_service', 'finality', 'implementation', 'sho_amendment')),
  "respondentKey" text not null default '',
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object'),
  "noDocument" boolean not null default false,
  "actorUserId" uuid not null,
  "actorName" text not null,
  "updatedAt" timestamptz not null default now(),
  unique ("caseId", "stepKey", "respondentKey")
);

create index if not exists dlos_cases_class_date_idx on public.dlos_cases (classification, "caseDate" desc, id);
create index if not exists dlos_cases_status_idx on public.dlos_cases ("caseStatus");
create index if not exists dlos_cases_didm_nsu_idx on public.dlos_cases (lower("didmNsuDocketNumber"));
create index if not exists dlos_cases_didm_ref_idx on public.dlos_cases (lower("didmReferenceNumber"));
create index if not exists dlos_cases_case_date_idx on public.dlos_cases ("caseDate");
create index if not exists dlos_cases_complaint_date_idx on public.dlos_cases ("complaintDate");
create index if not exists dlos_cases_forwarded_date_idx on public.dlos_cases ("forwardedToDlodDate");
create index if not exists dlos_case_personnel_case_idx on public.dlos_case_personnel ("caseId", position);
create index if not exists dlos_case_events_case_idx on public.dlos_case_events ("caseId", "createdAt" desc);
create index if not exists dlos_access_events_user_idx on public.dlos_access_events ("userId", "createdAt" desc);
create index if not exists dlos_case_updates_case_idx on public.dlos_case_updates ("caseId", "updateDate" desc, "createdAt" desc);
create index if not exists dlos_case_documents_case_idx on public.dlos_case_documents ("caseId", "uploadedAt" desc);
create index if not exists dlos_case_workflow_case_idx on public.dlos_case_workflow ("caseId", "updatedAt" desc);

alter table public.dlos_user_access enable row level security;
alter table public.dlos_access_events enable row level security;
alter table public.dlos_cases enable row level security;
alter table public.dlos_case_personnel enable row level security;
alter table public.dlos_case_events enable row level security;
alter table public.dlos_case_updates enable row level security;
alter table public.dlos_case_documents enable row level security;
alter table public.dlos_case_workflow enable row level security;

revoke all on public.dlos_user_access, public.dlos_access_events, public.dlos_cases,
  public.dlos_case_personnel, public.dlos_case_events, public.dlos_case_updates,
  public.dlos_case_documents, public.dlos_case_workflow from anon, authenticated;
grant all on public.dlos_user_access, public.dlos_access_events, public.dlos_cases,
  public.dlos_case_personnel, public.dlos_case_events, public.dlos_case_updates,
  public.dlos_case_documents, public.dlos_case_workflow to service_role;

-- Private Supabase Storage bucket. No direct client policy is added.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dlos-documents', 'dlos-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.dlos_record_access_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into public.dlos_access_events ("userId", "actorUserId", action, "accessRole")
    values (new."userId", new."grantedByUserId", 'grant', new."accessRole");
  elsif old.active and not new.active then
    insert into public.dlos_access_events ("userId", "actorUserId", action, "accessRole")
    values (new."userId", new."revokedByUserId", 'revoke', old."accessRole");
  elsif (not old.active and new.active) or old."accessRole" is distinct from new."accessRole" then
    insert into public.dlos_access_events ("userId", "actorUserId", action, "accessRole")
    values (new."userId", new."grantedByUserId", case when old.active then 'change_role' else 'grant' end, new."accessRole");
  end if;
  return new;
end;
$$;

drop trigger if exists dlos_access_change on public.dlos_user_access;
create trigger dlos_access_change after insert or update on public.dlos_user_access
for each row execute function public.dlos_record_access_change();

-- Atomic save: case, involved people, and event commit together.
create or replace function public.dlos_save_case(
  p_case jsonb, p_people jsonb, p_actor uuid, p_actor_name text,
  p_id uuid default null, p_expected_version integer default null
) returns uuid language plpgsql as $$
declare
  v_id uuid;
  v_prior public.dlos_cases%rowtype;
  v_person jsonb;
  v_person_id uuid;
  v_seen_ids uuid[] := '{}';
  v_position integer := 0;
begin
  if p_actor is null or jsonb_typeof(p_case) <> 'object' or jsonb_typeof(p_people) <> 'array' then
    raise exception 'Invalid case payload.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.dlos_cases (
      classification, "caseDate", "docketNumber", "didmNsuDocketNumber",
      "didmReferenceNumber", "summaryHearingDocketNumber", "presidentialConfirmation",
      "unitOfficeCaseFrom", "caseSource", "complaintDate", "forwardedToDlodDate",
      "shoName", "receivedByShoDate", "resolvedByShoDate", "decisionIssuedDate",
      "signedByDaDate", "dlodDocketNumber", "complaintSource", "initialComplaint",
      "occurrenceAt", "occurrencePlace", "complaintDetails",
      "sourceSystem", "sourceRecordId", "encodedByUserId", "encoderName",
      "createdByUserId", "updatedByUserId"
    ) values (
      p_case->>'classification', (p_case->>'caseDate')::date, p_case->>'docketNumber',
      coalesce(p_case->>'didmNsuDocketNumber', ''), coalesce(p_case->>'didmReferenceNumber', ''),
      coalesce(p_case->>'summaryHearingDocketNumber', ''),
      coalesce(p_case->>'presidentialConfirmation', 'not_applicable'),
      coalesce(p_case->>'unitOfficeCaseFrom', ''), coalesce(p_case->>'caseSource', ''),
      nullif(p_case->>'complaintDate', '')::date, nullif(p_case->>'forwardedToDlodDate', '')::date,
      coalesce(p_case->>'shoName', ''), nullif(p_case->>'receivedByShoDate', '')::date,
      nullif(p_case->>'resolvedByShoDate', '')::date, nullif(p_case->>'decisionIssuedDate', '')::date,
      nullif(p_case->>'signedByDaDate', '')::date, coalesce(p_case->>'dlodDocketNumber', ''),
      coalesce(p_case->>'complaintSource', ''), coalesce(p_case->>'initialComplaint', ''),
      nullif(p_case->>'occurrenceAt', '')::timestamp, coalesce(p_case->>'occurrencePlace', ''),
      coalesce(p_case->>'complaintDetails', ''),
      coalesce(p_case->>'sourceSystem', ''), coalesce(p_case->>'sourceRecordId', ''),
      p_actor, p_actor_name, p_actor, p_actor
    ) returning id into v_id;
  else
    select * into v_prior from public.dlos_cases where id = p_id for update;
    if not found or v_prior."archivedAt" is not null then
      raise exception 'Case not found.' using errcode = 'P0002';
    end if;
    if p_expected_version is distinct from v_prior.version then
      raise exception 'Case changed since it was opened.' using errcode = '40001';
    end if;
    if p_case->>'classification' is distinct from v_prior.classification then
      raise exception 'Case classification cannot be changed.' using errcode = '22023';
    end if;
    if coalesce(p_case->>'shoName', '') is distinct from v_prior."shoName" then
      raise exception 'Use Change Assigned SHO to amend the assigned officer.' using errcode = '22023';
    end if;
    update public.dlos_cases set
      "caseDate" = (p_case->>'caseDate')::date,
      "docketNumber" = p_case->>'docketNumber',
      "didmNsuDocketNumber" = coalesce(p_case->>'didmNsuDocketNumber', ''),
      "didmReferenceNumber" = coalesce(p_case->>'didmReferenceNumber', ''),
      "summaryHearingDocketNumber" = coalesce(p_case->>'summaryHearingDocketNumber', ''),
      "presidentialConfirmation" = coalesce(p_case->>'presidentialConfirmation', 'not_applicable'),
      "unitOfficeCaseFrom" = coalesce(p_case->>'unitOfficeCaseFrom', ''),
      "caseSource" = coalesce(p_case->>'caseSource', ''),
      "complaintDate" = nullif(p_case->>'complaintDate', '')::date,
      "forwardedToDlodDate" = nullif(p_case->>'forwardedToDlodDate', '')::date,
      "shoName" = coalesce(p_case->>'shoName', ''),
      "receivedByShoDate" = nullif(p_case->>'receivedByShoDate', '')::date,
      "resolvedByShoDate" = nullif(p_case->>'resolvedByShoDate', '')::date,
      "decisionIssuedDate" = nullif(p_case->>'decisionIssuedDate', '')::date,
      "signedByDaDate" = nullif(p_case->>'signedByDaDate', '')::date,
      "dlodDocketNumber" = coalesce(p_case->>'dlodDocketNumber', ''),
      "complaintSource" = coalesce(p_case->>'complaintSource', ''),
      "initialComplaint" = coalesce(p_case->>'initialComplaint', ''),
      "occurrenceAt" = nullif(p_case->>'occurrenceAt', '')::timestamp,
      "occurrencePlace" = coalesce(p_case->>'occurrencePlace', ''),
      "complaintDetails" = coalesce(p_case->>'complaintDetails', ''),
      "sourceSystem" = coalesce(p_case->>'sourceSystem', ''),
      "sourceRecordId" = coalesce(p_case->>'sourceRecordId', ''),
      "updatedByUserId" = p_actor, "updatedAt" = now(), version = version + 1
    where id = p_id;
    v_id := p_id;
  end if;

  for v_person in select value from jsonb_array_elements(p_people) loop
    v_person_id := null;
    if coalesce(v_person->>'role', 'involved') <> 'respondent'
      and exists (select 1 from public.dlos_case_workflow w where w."caseId" = v_id
        and w."stepKey" = 'implementation' and w."respondentKey" = v_person->>'id') then
      raise exception 'A respondent with an implementation order must remain a respondent.' using errcode = '22023';
    end if;
    insert into public.dlos_case_personnel (
      id, "caseId", "personnelId", role, rank, "firstName", "middleName", "lastName", "nameSnapshot", unit, status, position
    ) values (
      coalesce(nullif(v_person->>'id', '')::uuid, gen_random_uuid()),
      v_id, nullif(v_person->>'personnelId', ''), coalesce(v_person->>'role', 'involved'),
      coalesce(v_person->>'rank', ''), coalesce(v_person->>'firstName', ''),
      coalesce(v_person->>'middleName', ''), coalesce(v_person->>'lastName', ''),
      v_person->>'nameSnapshot', coalesce(v_person->>'unit', ''), coalesce(v_person->>'status', ''), v_position
    ) on conflict (id) do update set "personnelId" = excluded."personnelId", role = excluded.role,
      rank = excluded.rank, "firstName" = excluded."firstName", "middleName" = excluded."middleName",
      "lastName" = excluded."lastName", "nameSnapshot" = excluded."nameSnapshot",
      unit = excluded.unit, status = excluded.status, position = excluded.position
    where public.dlos_case_personnel."caseId" = v_id
    returning id into v_person_id;
    if v_person_id is null then
      raise exception 'Person does not belong to this case.' using errcode = '22023';
    end if;
    v_seen_ids := array_append(v_seen_ids, v_person_id);
    v_position := v_position + 1;
  end loop;

  if p_id is not null then
    if exists (select 1 from public.dlos_case_personnel p
      join public.dlos_case_workflow w on w."caseId" = p."caseId" and w."stepKey" = 'implementation'
        and w."respondentKey" = p.id::text
      where p."caseId" = v_id and not (p.id = any(v_seen_ids))) then
      raise exception 'A respondent with an implementation order cannot be removed.' using errcode = '22023';
    end if;
    delete from public.dlos_case_personnel p where p."caseId" = v_id and not (p.id = any(v_seen_ids));
  end if;

  insert into public.dlos_case_events (
    "caseId", "eventType", "changedFields", "fromStatus", "toStatus", "actorUserId", "actorName"
  ) values (
    v_id, case when p_id is null then 'created' else 'updated' end,
    case when p_id is null then array[]::text[] else array(select jsonb_object_keys(p_case)) || array['people'] end,
    case when p_id is null then null else v_prior."caseStatus" end,
    case when p_id is null then 'For Updating by DLOS Encoder' else v_prior."caseStatus" end,
    p_actor, p_actor_name
  );
  return v_id;
end;
$$;

-- Base-system actions: change SHO, record SHO receipt, and add a dated update.
create or replace function public.dlos_case_action(
  p_id uuid, p_action text, p_expected_version integer,
  p_actor uuid, p_actor_name text, p_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare
  v_case public.dlos_cases%rowtype;
  v_received date;
  v_note text;
  v_reason text;
  v_status text;
  v_update_date date;
begin
  select * into v_case from public.dlos_cases where id = p_id for update;
  if not found or v_case."archivedAt" is not null then
    raise exception 'Case not found.' using errcode = 'P0002';
  end if;
  if v_case.version <> p_expected_version then
    raise exception 'Case changed since it was opened.' using errcode = '40001';
  end if;
  if p_action = 'record_sho_received' then
    v_received := nullif(p_payload->>'receivedByShoDate', '')::date;
    if v_received is null or (v_case."resolvedByShoDate" is not null and v_received > v_case."resolvedByShoDate") then
      raise exception 'A valid received-by-SHO date is required and must not follow the resolution date.' using errcode = '22023';
    end if;
    update public.dlos_cases set "receivedByShoDate" = v_received, "updatedByUserId" = p_actor,
      "updatedAt" = now(), version = version + 1 where id = p_id;
  elsif p_action = 'add_update' then
    v_note := trim(coalesce(p_payload->>'note', ''));
    v_update_date := nullif(p_payload->>'updateDate', '')::date;
    if length(v_note) not between 1 and 2000 or v_update_date is null then
      raise exception 'Update date and note are required.' using errcode = '22023';
    end if;
    insert into public.dlos_case_updates ("caseId", "updateDate", note, "actorUserId", "actorName")
    values (p_id, v_update_date, v_note, p_actor, p_actor_name);
    update public.dlos_cases set "updatedByUserId" = p_actor, "updatedAt" = now(),
      version = version + 1 where id = p_id;
  elsif p_action = 'refer_case' then
    v_reason := trim(coalesce(p_payload->>'reason', ''));
    if length(v_reason) not between 1 and 2000 then
      raise exception 'Referral reason is required and must be 2000 characters or fewer.' using errcode = '22023';
    end if;
    update public.dlos_cases set "updatedByUserId" = p_actor, "updatedAt" = now(),
      version = version + 1 where id = p_id;
  elsif p_action = 'set_status' then
    v_status := trim(coalesce(p_payload->>'caseStatus', ''));
    v_reason := trim(coalesce(p_payload->>'reason', ''));
    if v_status not in ('For Updating by DLOS Encoder', 'For Investigation',
      '1 Under Summary Hearing', '2 For Designation of Summary Hearing Officer',
      '3 For Acceptance of Summary Hearing Officer', '4 For Submission of ROI',
      '4 Forwarded to IAS', '6 Case Resolved', '7 Submitted Resolution of IG/IAS / CDAC',
      '8 Decision', '9 For Presidential Confirmation',
      '10 Proof of Service From Receipt of Decision', '11 Motion for Reconsideration (MR)',
      '12 Resolution', '13 Proof of Service of MR', '14 Certificate of Finality', '15 Implementation')
      or v_status = v_case."caseStatus" or length(v_reason) not between 1 and 500 then
      raise exception 'Select a different status and provide a reason.' using errcode = '22023';
    end if;
    update public.dlos_cases set "caseStatus" = v_status, "updatedByUserId" = p_actor,
      "updatedAt" = now(), version = version + 1 where id = p_id;
  else
    raise exception 'Unknown case action.' using errcode = '22023';
  end if;
  insert into public.dlos_case_events (
    "caseId", "eventType", "changedFields", "fromStatus", "toStatus", "actorUserId", "actorName", reason
  ) values (p_id, p_action, array[case when p_action = 'record_sho_received' then 'receivedByShoDate'
      when p_action = 'refer_case' then 'referral'
      when p_action = 'set_status' then 'caseStatus' else 'updates' end],
      v_case."caseStatus", case when p_action = 'set_status' then v_status else v_case."caseStatus" end,
      p_actor, p_actor_name,
      case when p_action in ('refer_case', 'set_status') then v_reason else '' end);
  return p_id;
end;
$$;

create or replace function public.dlos_record_document(
  p_case_id uuid, p_kind text, p_file_name text, p_mime_type text,
  p_file_size integer, p_storage_path text, p_actor uuid, p_actor_name text
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.dlos_cases where id = p_case_id and "archivedAt" is null) then
    raise exception 'Case not found.' using errcode = 'P0002';
  end if;
  insert into public.dlos_case_documents (
    "caseId", kind, "fileName", "mimeType", "fileSize", "storagePath", "uploadedByUserId", "uploaderName"
  ) values (p_case_id, p_kind, p_file_name, p_mime_type, p_file_size, p_storage_path, p_actor, p_actor_name)
  returning id into v_id;
  update public.dlos_cases set "updatedByUserId" = p_actor, "updatedAt" = now(), version = version + 1
  where id = p_case_id;
  insert into public.dlos_case_events (
    "caseId", "eventType", "changedFields", "actorUserId", "actorName"
  ) values (p_case_id, 'document_uploaded', array['documents'], p_actor, p_actor_name);
  return v_id;
end;
$$;

create or replace function public.dlos_record_dated_document(
  p_case_id uuid, p_kind text, p_document_date date, p_file_name text,
  p_mime_type text, p_file_size integer, p_storage_path text,
  p_actor uuid, p_actor_name text
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_document_date is null then
    raise exception 'Document date is required.' using errcode = '22023';
  end if;
  v_id := public.dlos_record_document(p_case_id, p_kind, p_file_name, p_mime_type,
    p_file_size, p_storage_path, p_actor, p_actor_name);
  update public.dlos_case_documents set "documentDate" = p_document_date where id = v_id;
  return v_id;
end;
$$;

create or replace function public.dlos_record_workflow(
  p_case_id uuid, p_step text, p_expected_version integer, p_fields jsonb,
  p_no_document boolean, p_files jsonb, p_actor uuid, p_actor_name text
) returns uuid language plpgsql as $$
declare
  v_case public.dlos_cases%rowtype;
  v_file jsonb;
  v_respondent_key text := '';
begin
  if p_step not in ('roi', 'resolution', 'decision', 'decision_resolution', 'decision_service',
    'mr_resolution', 'mr_service', 'finality', 'implementation', 'sho_amendment')
    or jsonb_typeof(p_fields) <> 'object' or jsonb_typeof(p_files) <> 'array' then
    raise exception 'Invalid workflow payload.' using errcode = '22023';
  end if;
  select * into v_case from public.dlos_cases where id = p_case_id and "archivedAt" is null for update;
  if not found then raise exception 'Case not found.' using errcode = 'P0002'; end if;
  if v_case.version <> p_expected_version then
    raise exception 'Case changed since it was opened.' using errcode = '40001';
  end if;
  if p_step = 'implementation' then
    v_respondent_key := coalesce(p_fields->>'respondentKey', '');
    if not exists (select 1 from public.dlos_case_personnel where id::text = v_respondent_key
      and "caseId" = p_case_id and role = 'respondent') then
      raise exception 'Select a respondent in this case.' using errcode = '22023';
    end if;
  end if;
  if p_step = 'sho_amendment' and length(trim(coalesce(p_fields->>'shoName', ''))) = 0 then
    raise exception 'New SHO is required.' using errcode = '22023';
  end if;
  if p_step = 'decision' and v_case."resolvedByShoDate" is not null
    and nullif(p_fields->>'decisionDate', '')::date < v_case."resolvedByShoDate" then
    raise exception 'Decision date cannot precede the SHO resolution date.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_files) = 0 and not p_no_document and not exists
    (select 1 from public.dlos_case_documents where "caseId" = p_case_id
      and "stepKey" = p_step and "respondentKey" = v_respondent_key) then
    raise exception 'Upload a document or select No document available.' using errcode = '22023';
  end if;

  insert into public.dlos_case_workflow
    ("caseId", "stepKey", "respondentKey", fields, "noDocument", "actorUserId", "actorName")
  values (p_case_id, p_step, v_respondent_key, p_fields, p_no_document, p_actor, p_actor_name)
  on conflict ("caseId", "stepKey", "respondentKey") do update set
    fields = excluded.fields, "noDocument" = excluded."noDocument",
    "actorUserId" = excluded."actorUserId", "actorName" = excluded."actorName", "updatedAt" = now();

  for v_file in select value from jsonb_array_elements(p_files) loop
    if coalesce((v_file->>'fileSize')::integer, 0) not between 1 and 10485760
      or v_file->>'mimeType' not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
      raise exception 'Invalid workflow document.' using errcode = '22023';
    end if;
    insert into public.dlos_case_documents
      ("caseId", kind, "stepKey", "fileRole", "respondentKey", "documentDate", "fileName",
       "mimeType", "fileSize", "storagePath", "uploadedByUserId", "uploaderName")
    values (p_case_id, case when p_step = 'sho_amendment' then 'sho_memorandum' else 'workflow' end,
      p_step, v_file->>'fileRole', v_respondent_key,
      nullif(coalesce(p_fields->>'documentDate', p_fields->>'orderDate', p_fields->>'decisionDate',
        p_fields->>'resolutionDate', p_fields->>'roiDate', p_fields->>'finalityDate',
        p_fields->>'receivedDate', p_fields->>'serviceDate', p_fields->>'memorandumDate'), '')::date,
      v_file->>'fileName', v_file->>'mimeType', (v_file->>'fileSize')::integer,
      v_file->>'storagePath', p_actor, p_actor_name);
  end loop;

  update public.dlos_cases set
    "shoName" = case when p_step = 'sho_amendment' then p_fields->>'shoName' else "shoName" end,
    "decisionIssuedDate" = case when p_step = 'decision' then nullif(p_fields->>'decisionDate', '')::date else "decisionIssuedDate" end,
    "signedByDaDate" = case when p_step = 'decision' then nullif(p_fields->>'decisionDate', '')::date else "signedByDaDate" end,
    "updatedByUserId" = p_actor, "updatedAt" = now(), version = version + 1
  where id = p_case_id;
  insert into public.dlos_case_events
    ("caseId", "eventType", "changedFields", "fromStatus", "toStatus", "actorUserId", "actorName")
  values (p_case_id, case when p_step = 'sho_amendment' then 'change_sho' else 'workflow_update' end,
    array[p_step], v_case."caseStatus", v_case."caseStatus", p_actor, p_actor_name);
  return p_case_id;
end;
$$;

create or replace function public.dlos_search_cases(
  p_year integer, p_month integer, p_classification text, p_filters jsonb default '{}'::jsonb,
  p_page integer default 1, p_page_size integer default 10,
  p_sort text default 'caseDate', p_direction text default 'desc'
) returns jsonb language sql stable as $$
  with filtered as (
    select c.* from public.dlos_cases c
    where c."archivedAt" is null
      and (p_classification = 'all' or c.classification = p_classification)
      and c."caseDate" >= make_date(p_year, p_month, 1)
      and c."caseDate" < (make_date(p_year, p_month, 1) + interval '1 month')::date
      and (coalesce(p_filters->>'docketNumber', '') = '' or position(lower(p_filters->>'docketNumber') in lower(c."docketNumber")) > 0)
      and (coalesce(p_filters->>'didmNsuDocketNumber', '') = '' or position(lower(p_filters->>'didmNsuDocketNumber') in lower(c."didmNsuDocketNumber")) > 0)
      and (coalesce(p_filters->>'didmReferenceNumber', '') = '' or position(lower(p_filters->>'didmReferenceNumber') in lower(c."didmReferenceNumber")) > 0)
      and (coalesce(p_filters->>'summaryHearingDocketNumber', '') = '' or position(lower(p_filters->>'summaryHearingDocketNumber') in lower(c."summaryHearingDocketNumber")) > 0)
      and (coalesce(p_filters->>'presidentialConfirmation', '') = '' or c."presidentialConfirmation" = p_filters->>'presidentialConfirmation')
      and (coalesce(p_filters->>'unitOfficeCaseFrom', '') = '' or position(lower(p_filters->>'unitOfficeCaseFrom') in lower(c."unitOfficeCaseFrom")) > 0)
      and (coalesce(p_filters->>'caseStatus', '') = '' or c."caseStatus" = p_filters->>'caseStatus')
      and (coalesce(p_filters->>'shoName', '') = '' or position(lower(p_filters->>'shoName') in lower(c."shoName")) > 0)
      and (coalesce(p_filters->>'dateFrom', '') = '' or
        (case p_filters->>'dateField'
          when 'caseDate' then c."caseDate"
          when 'signedByDaDate' then c."signedByDaDate"
          when 'complaintDate' then c."complaintDate"
          when 'forwardedToDlodDate' then c."forwardedToDlodDate"
          when 'receivedByShoDate' then c."receivedByShoDate"
          when 'resolvedByShoDate' then c."resolvedByShoDate"
          when 'decisionIssuedDate' then c."decisionIssuedDate"
        end) >= (p_filters->>'dateFrom')::date)
      and (coalesce(p_filters->>'dateTo', '') = '' or
        (case p_filters->>'dateField'
          when 'caseDate' then c."caseDate"
          when 'signedByDaDate' then c."signedByDaDate"
          when 'complaintDate' then c."complaintDate"
          when 'forwardedToDlodDate' then c."forwardedToDlodDate"
          when 'receivedByShoDate' then c."receivedByShoDate"
          when 'resolvedByShoDate' then c."resolvedByShoDate"
          when 'decisionIssuedDate' then c."decisionIssuedDate"
        end) <= (p_filters->>'dateTo')::date)
      and (
        (coalesce(p_filters->>'rank', '') = '' and coalesce(p_filters->>'firstName', '') = ''
          and coalesce(p_filters->>'middleName', '') = '' and coalesce(p_filters->>'lastName', '') = '')
        or exists (
          select 1 from public.dlos_case_personnel p where p."caseId" = c.id
            and (coalesce(p_filters->>'rank', '') = '' or position(lower(p_filters->>'rank') in lower(p.rank)) > 0)
            and (coalesce(p_filters->>'firstName', '') = '' or position(lower(p_filters->>'firstName') in lower(p."firstName")) > 0)
            and (coalesce(p_filters->>'middleName', '') = '' or position(lower(p_filters->>'middleName') in lower(p."middleName")) > 0)
            and (coalesce(p_filters->>'lastName', '') = '' or position(lower(p_filters->>'lastName') in lower(p."lastName")) > 0)
        )
      )
  ), sorted as (
    select f.*, row_number() over (order by
      case when p_sort = 'caseDate' and p_direction = 'asc' then f."caseDate" end asc,
      case when p_sort = 'caseDate' and p_direction = 'desc' then f."caseDate" end desc,
      case when p_sort = 'docketNumber' and p_direction = 'asc' then lower(f."docketNumber") end asc,
      case when p_sort = 'docketNumber' and p_direction = 'desc' then lower(f."docketNumber") end desc,
      case when p_sort = 'caseStatus' and p_direction = 'asc' then f."caseStatus" end asc,
      case when p_sort = 'caseStatus' and p_direction = 'desc' then f."caseStatus" end desc,
      case when p_sort = 'updatedAt' and p_direction = 'asc' then f."updatedAt" end asc,
      case when p_sort = 'updatedAt' and p_direction = 'desc' then f."updatedAt" end desc,
      f.id desc
    ) as "rowOrdinal" from filtered f
  ), page_rows as (
    select * from sorted
    where "rowOrdinal" > (greatest(p_page, 1) - 1) * greatest(1, least(p_page_size, 50))
      and "rowOrdinal" <= greatest(p_page, 1) * greatest(1, least(p_page_size, 50))
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((select jsonb_agg((to_jsonb(c) - 'rowOrdinal') || jsonb_build_object(
      'people', coalesce((select jsonb_agg(to_jsonb(p) order by p.position) from public.dlos_case_personnel p where p."caseId" = c.id), '[]'::jsonb)
    ) order by c."rowOrdinal") from page_rows c), '[]'::jsonb)
  );
$$;

create or replace function public.dlos_case_options()
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('year', year, 'month', month, 'count', count)
    order by year desc, month asc), '[]'::jsonb)
  from (
    select extract(year from "caseDate")::integer as year,
      extract(month from "caseDate")::integer as month, count(*)::integer as count
    from public.dlos_cases where "archivedAt" is null group by 1, 2
  ) periods;
$$;

revoke all on function public.dlos_save_case(jsonb, jsonb, uuid, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.dlos_case_action(uuid, text, integer, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.dlos_record_document(uuid, text, text, text, integer, text, uuid, text) from public, anon, authenticated;
revoke all on function public.dlos_record_dated_document(uuid, text, date, text, text, integer, text, uuid, text) from public, anon, authenticated;
revoke all on function public.dlos_record_workflow(uuid, text, integer, jsonb, boolean, jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.dlos_search_cases(integer, integer, text, jsonb, integer, integer, text, text) from public, anon, authenticated;
revoke all on function public.dlos_case_options() from public, anon, authenticated;
grant execute on function public.dlos_save_case(jsonb, jsonb, uuid, text, uuid, integer) to service_role;
grant execute on function public.dlos_case_action(uuid, text, integer, uuid, text, jsonb) to service_role;
grant execute on function public.dlos_record_document(uuid, text, text, text, integer, text, uuid, text) to service_role;
grant execute on function public.dlos_record_dated_document(uuid, text, date, text, text, integer, text, uuid, text) to service_role;
grant execute on function public.dlos_record_workflow(uuid, text, integer, jsonb, boolean, jsonb, uuid, text) to service_role;
grant execute on function public.dlos_search_cases(integer, integer, text, jsonb, integer, integer, text, text) to service_role;
grant execute on function public.dlos_case_options() to service_role;

-- Verify after migration:
-- select table_name, row_security from information_schema.tables where table_schema = 'public' and table_name like 'dlos_%';
-- select routine_name from information_schema.routines where routine_schema = 'public' and routine_name like 'dlos_%';
-- select * from public.dlos_user_access limit 1; -- service role only
