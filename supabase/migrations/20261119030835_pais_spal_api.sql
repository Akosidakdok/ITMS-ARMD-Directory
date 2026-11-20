begin;

create schema if not exists pais_spal;
revoke all on schema pais_spal from public, anon, authenticated;
grant usage on schema pais_spal to service_role;

alter table public.promotions add column if not exists implemented boolean not null default true;

create function pais_spal.rank_code(value text) returns text
language sql immutable strict set search_path = '' as $$
    select case upper(regexp_replace(trim(value), '[/ .]+', '', 'g'))
        when 'PAT' then 'Pat' when 'PCPL' then 'PCpl' when 'PSSG' then 'PSSg' when 'PMSG' then 'PMSg'
        when 'PSMS' then 'PSMS' when 'PCMS' then 'PCMS' when 'PEMS' then 'PEMS'
        when 'PLT' then 'PLT' when 'PCPT' then 'PCPT' when 'PCAPT' then 'PCPT'
        when 'PMAJ' then 'PMAJ' when 'PLTCOL' then 'PLTCOL' when 'PLCOL' then 'PLTCOL'
        when 'PCOL' then 'PCOL' when 'PBGEN' then 'PBGEN' when 'PMGEN' then 'PMGEN'
        when 'PLTGEN' then 'PLTGEN' when 'PGEN' then 'PGEN'
    end
$$;

create table pais_spal.personnel_link (
    personnel_uuid uuid primary key,
    personnel_id text not null unique references public.personnel(id),
    baseline_rank text check (baseline_rank is null or pais_spal.rank_code(baseline_rank) is not null),
    baseline_date date,
    rank_revision bigint not null default 0,
    published_rank text,
    published_promotion_id text,
    published_date date,
    last_rank_check timestamptz not null default '-infinity',
    assignment_revision bigint not null default 0
);

create table pais_spal.office_map (
    office_code text not null,
    dashboard_unit_key text not null default '',
    unit text not null check (length(trim(unit)) > 0),
    sub_unit text not null default '',
    unit_category text not null default 'ITMS HQ',
    sub_unit_category text not null default 'Division',
    primary key (office_code, dashboard_unit_key)
);

create table pais_spal.rank_outbox (
    event_id uuid primary key default gen_random_uuid(),
    personnel_uuid uuid not null references pais_spal.personnel_link,
    revision bigint not null,
    rank text not null,
    category text not null,
    effective_date date not null,
    promotion_id text,
    next_attempt_at timestamptz not null default now(),
    delivered_at timestamptz,
    unique (personnel_uuid, revision)
);
create index on pais_spal.rank_outbox (next_attempt_at) where delivered_at is null;

create table pais_spal.assignment_receipt (
    event_id uuid primary key,
    personnel_uuid uuid not null references pais_spal.personnel_link,
    movement_id text not null unique,
    revision bigint not null,
    payload jsonb not null,
    applied boolean not null,
    received_at timestamptz not null default now()
);

create table pais_spal.promotion_audit (
    id bigint generated always as identity primary key,
    personnel_uuid uuid not null references pais_spal.personnel_link,
    action text not null,
    before_state jsonb,
    after_state jsonb,
    recorded_at timestamptz not null default now()
);

grant select, insert, update on all tables in schema pais_spal to service_role;
grant usage on all sequences in schema pais_spal to service_role;

-- Enforce posting ownership across assignment CRUD, orders, reconciliation, and imports.
create function pais_spal.guard_posting() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    posting_fields text[] := array[
        'unit','unit_code','unitCode','sub_unit','sub_unit_code','subUnitCode','division','officeDivision',
        'station','station_code','stationCode','sub_station','subStation','sub_station_code','subStationCode',
        'designation','designationDate','designation_date','effectiveDate','unitCategory','subUnitCategory',
        'positionCategory','details','detail'
    ];
begin
    if current_setting('pais_spal.apply_assignment', true) = 'on' then
        return case when tg_op = 'DELETE' then old else new end;
    end if;
    if tg_table_name = 'assignments' then
        if (tg_op <> 'INSERT' and coalesce(nullif(old."positionCategory", ''), 'Main') = 'Main'
                and exists (select 1 from pais_spal.personnel_link where personnel_id = old."personnelId"))
            or (tg_op <> 'DELETE' and coalesce(nullif(new."positionCategory", ''), 'Main') = 'Main'
                and exists (select 1 from pais_spal.personnel_link where personnel_id = new."personnelId")) then
            raise exception 'SPAL owns this principal assignment' using errcode = '42501';
        end if;
    elsif exists (select 1 from pais_spal.personnel_link where personnel_id = old.id) then
        if exists (select 1 from unnest(posting_fields) as field
            where to_jsonb(new)->field is distinct from to_jsonb(old)->field) then
            raise exception 'SPAL owns this personnel posting' using errcode = '42501';
        end if;
        if current_setting('pais_spal.project_rank', true) is distinct from 'on'
            and exists (select 1 from pais_spal.personnel_link where personnel_id = old.id and baseline_rank is not null)
            and (new.rank, new."rankCategory", new."lastPromotionDate", new.last_promotion_date)
                is distinct from (old.rank, old."rankCategory", old."lastPromotionDate", old.last_promotion_date) then
            raise exception 'Use the PAIS promotion workflow for linked personnel rank' using errcode = '42501';
        end if;
    end if;
    return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger pais_spal_guard_assignment before insert or update or delete on public.assignments
for each row execute function pais_spal.guard_posting();
create trigger pais_spal_guard_personnel before update on public.personnel
for each row execute function pais_spal.guard_posting();

-- Prevent linked promotion mutations from bypassing the transactional backend path.
create function pais_spal.guard_promotion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if current_setting('pais_spal.change_promotion', true) is distinct from 'on'
        and ((tg_op <> 'INSERT' and exists (
            select 1 from pais_spal.personnel_link where personnel_id = old."personnelId" and baseline_rank is not null))
        or (tg_op <> 'DELETE' and exists (
            select 1 from pais_spal.personnel_link where personnel_id = new."personnelId" and baseline_rank is not null))) then
        raise exception 'Use the PAIS promotion workflow for linked personnel' using errcode = '42501';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger pais_spal_guard_promotion before insert or update or delete on public.promotions
for each row execute function pais_spal.guard_promotion();

create function pais_spal.project_rank(link_uuid uuid) returns void
language plpgsql set search_path = '' as $$
declare
    link pais_spal.personnel_link;
    promotion public.promotions;
    today date := (now() at time zone 'Asia/Manila')::date;
    next_rank text;
    next_category text;
    next_date date;
begin
    select * into link from pais_spal.personnel_link where personnel_uuid = link_uuid for update;
    if not found or link.baseline_rank is null then return; end if;
    select * into promotion from public.promotions
    where "personnelId" = link.personnel_id and implemented and "promotionDate" <= today
    order by "promotionDate" desc, "createdAt" desc, id desc limit 1;

    next_rank := pais_spal.rank_code(coalesce(promotion."rankTo", link.baseline_rank));
    if next_rank is null then
        raise exception 'Unrecognized current rank code for linked personnel' using errcode = '22023';
    end if;
    next_date := coalesce(promotion."promotionDate", link.baseline_date);
    if next_date > today then raise exception 'Future rank baseline' using errcode = '22023'; end if;
    next_category := case when next_rank in ('PLT','PCPT','PMAJ','PLTCOL','PCOL','PBGEN','PMGEN','PLTGEN','PGEN')
        then 'PCO' else 'PNCO' end;

    update pais_spal.personnel_link set last_rank_check = clock_timestamp() where personnel_uuid = link_uuid;
    if (next_rank, promotion.id, next_date) is not distinct from
        (link.published_rank, link.published_promotion_id, link.published_date) then
        return;
    end if;

    perform set_config('pais_spal.project_rank', 'on', true);
    update public.personnel set rank = next_rank, "rankCategory" = next_category,
        "lastPromotionDate" = next_date::text, last_promotion_date = next_date::text
    where id = link.personnel_id;
    perform set_config('pais_spal.project_rank', 'off', true);
    update pais_spal.personnel_link set rank_revision = rank_revision + 1, published_rank = next_rank,
        published_promotion_id = promotion.id, published_date = next_date where personnel_uuid = link_uuid;
    insert into pais_spal.rank_outbox (personnel_uuid, revision, rank, category, effective_date, promotion_id)
    values (link_uuid, link.rank_revision + 1, next_rank, next_category, coalesce(next_date, today), promotion.id);
end
$$;

create function public.pais_spal_change_promotion(p_action text, p_id text, p_data jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
    current_row public.promotions;
    input_row public.promotions;
    before_state jsonb;
    link_uuid uuid;
    person_id text;
begin
    if p_action not in ('create', 'update', 'delete') then
        raise exception 'Invalid promotion action' using errcode = '22023';
    end if;
    if p_action = 'create' then
        person_id := p_data->>'personnelId';
    else
        select * into current_row from public.promotions where id = p_id;
        if not found then return null; end if;
        person_id := current_row."personnelId";
        if p_data ? 'personnelId' and p_data->>'personnelId' is distinct from person_id then
            raise exception 'A promotion cannot be moved to another person' using errcode = '22023';
        end if;
    end if;

    select personnel_uuid into link_uuid from pais_spal.personnel_link
    where personnel_id = person_id and baseline_rank is not null for update;
    if p_action <> 'create' then
        select * into current_row from public.promotions where id = p_id for update;
        if not found then return null; end if;
        before_state := to_jsonb(current_row);
    end if;
    input_row := jsonb_populate_record(current_row, coalesce(p_data, '{}'::jsonb));
    if link_uuid is not null and p_action <> 'delete'
        and (pais_spal.rank_code(input_row."rankTo") is null or pais_spal.rank_code(input_row."rankFrom") is null) then
        raise exception 'Unsupported promotion rank' using errcode = '22023';
    end if;

    perform set_config('pais_spal.change_promotion', 'on', true);
    if p_action = 'create' then
        insert into public.promotions (id, "personnelId", "rankFrom", "rankTo", "promotionDate", "orderNumber",
            authority, "timeInGradeAtPromotion", remarks, implemented)
        values (p_id, person_id, input_row."rankFrom", input_row."rankTo", input_row."promotionDate", input_row."orderNumber",
            input_row.authority, input_row."timeInGradeAtPromotion", input_row.remarks, coalesce(input_row.implemented, true))
        returning * into current_row;
    elsif p_action = 'update' then
        update public.promotions set "rankFrom" = input_row."rankFrom", "rankTo" = input_row."rankTo",
            "promotionDate" = input_row."promotionDate", "orderNumber" = input_row."orderNumber",
            authority = input_row.authority, "timeInGradeAtPromotion" = input_row."timeInGradeAtPromotion",
            remarks = input_row.remarks, implemented = input_row.implemented, "updatedAt" = now()
        where id = p_id returning * into current_row;
    else
        delete from public.promotions where id = p_id returning * into current_row;
    end if;
    perform set_config('pais_spal.change_promotion', 'off', true);
    if link_uuid is not null then
        insert into pais_spal.promotion_audit (personnel_uuid, action, before_state, after_state)
        values (link_uuid, p_action, before_state, case when p_action <> 'delete' then to_jsonb(current_row) end);
        perform pais_spal.project_rank(link_uuid);
    end if;
    return jsonb_build_object('promotion', to_jsonb(current_row), 'linked', link_uuid is not null);
end
$$;

create function public.pais_spal_pending_ranks() returns setof jsonb
language plpgsql set search_path = '' as $$
declare
    link_uuid uuid;
begin
    for link_uuid in select personnel_uuid from pais_spal.personnel_link
        where baseline_rank is not null order by last_rank_check, personnel_uuid limit 100 for update skip locked
    loop
        begin
            perform pais_spal.project_rank(link_uuid);
        exception when invalid_parameter_value then
            update pais_spal.personnel_link set last_rank_check = clock_timestamp() where personnel_uuid = link_uuid;
            raise warning 'PAIS integration rank requires review for mapping %', link_uuid;
        end;
    end loop;

    return query select jsonb_build_object(
        'event_id', event_id, 'type', 'personnel.rank_changed.v1', 'personnel_uuid', personnel_uuid,
        'revision', revision, 'rank', rank, 'category', category, 'effective_date', effective_date, 'promotion_id', promotion_id)
    from pais_spal.rank_outbox where delivered_at is null and next_attempt_at <= now()
    order by next_attempt_at, revision, event_id limit 50;
end
$$;

create function public.pais_spal_finish_rank(p_event_id uuid, p_delivered boolean) returns void
language sql set search_path = '' as $$
    update pais_spal.rank_outbox set delivered_at = case when p_delivered then now() end,
        next_attempt_at = now() + interval '5 minutes'
    where event_id = p_event_id and delivered_at is null
$$;

create function public.pais_spal_owned_postings(p_personnel_ids text[]) returns setof text
language sql stable set search_path = '' as $$
    select personnel_id from pais_spal.personnel_link where personnel_id = any(p_personnel_ids)
$$;

create function public.pais_spal_apply_assignment(p_event jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
    event_uuid uuid := (p_event->>'event_id')::uuid;
    link_uuid uuid := (p_event->>'personnel_uuid')::uuid;
    event_revision bigint := (p_event->>'revision')::bigint;
    effective date := (p_event->>'effective_date')::date;
    posting_designation text := p_event->>'designation';
    location text := p_event->>'location';
    link pais_spal.personnel_link;
    destination pais_spal.office_map;
    previous_event pais_spal.assignment_receipt;
begin
    if effective > (now() at time zone 'Asia/Manila')::date then
        return jsonb_build_object('status', 'future_effective_date');
    end if;
    select * into link from pais_spal.personnel_link where personnel_uuid = link_uuid for update;
    if not found then return jsonb_build_object('status', 'unmapped_personnel'); end if;

    select * into previous_event from pais_spal.assignment_receipt
    where event_id = event_uuid or movement_id = p_event->>'movement_id';
    if found then
        return jsonb_build_object('status', case when previous_event.payload = p_event then 'duplicate' else 'event_conflict' end);
    end if;
    if event_revision <= link.assignment_revision then
        insert into pais_spal.assignment_receipt values (
            event_uuid, link_uuid, p_event->>'movement_id', event_revision, p_event, false, now());
        return jsonb_build_object('status', 'stale');
    end if;
    select * into destination from pais_spal.office_map
    where office_code = p_event->>'office_code' and dashboard_unit_key = p_event->>'dashboard_unit_key';
    if not found then return jsonb_build_object('status', 'unmapped_office'); end if;
    if exists (
        select 1 from public.assignments where "personnelId" = link.personnel_id
            and status = 'Current' and coalesce(nullif("positionCategory", ''), 'Main') = 'Main'
            and coalesce(nullif("effectiveDate"::text, ''), nullif("startDate"::text, '')) > effective::text
    ) then return jsonb_build_object('status', 'backdated_assignment_requires_review'); end if;

    perform set_config('pais_spal.apply_assignment', 'on', true);
    update public.assignments set status = 'Completed',
        "endDate" = case when coalesce(nullif("effectiveDate"::text, ''), nullif("startDate"::text, '')) = effective::text
            then effective::text else (effective - 1)::text end,
        "updatedAt" = now()
    where "personnelId" = link.personnel_id and status = 'Current'
        and coalesce(nullif("positionCategory", ''), 'Main') = 'Main';

    insert into public.assignments (id, "personnelId", unit, position, "startDate", "effectiveDate",
        "designationDate", status, "positionCategory", "unitCategory", "subUnitCategory", sub_unit, station)
    values ('spal-' || event_uuid, link.personnel_id, destination.unit, posting_designation, effective::text, effective::text,
        effective::text, 'Current', 'Main', destination.unit_category, destination.sub_unit_category,
        destination.sub_unit, location);

    update public.personnel set unit = destination.unit, sub_unit = destination.sub_unit, division = destination.sub_unit,
        "officeDivision" = destination.sub_unit, designation = posting_designation, station = location,
        "effectiveDate" = effective::text, "designationDate" = effective::text, designation_date = effective::text,
        "unitCategory" = destination.unit_category, "subUnitCategory" = destination.sub_unit_category, "positionCategory" = 'Main'
    where id = link.personnel_id;
    perform set_config('pais_spal.apply_assignment', 'off', true);

    update pais_spal.personnel_link set assignment_revision = event_revision where personnel_uuid = link_uuid;
    insert into pais_spal.assignment_receipt values (
        event_uuid, link_uuid, p_event->>'movement_id', event_revision, p_event, true, now());
    return jsonb_build_object('status', 'applied');
end
$$;

revoke execute on all functions in schema pais_spal from public, anon, authenticated;
grant execute on function pais_spal.rank_code(text), pais_spal.project_rank(uuid) to service_role;

revoke execute on function public.pais_spal_change_promotion(text,text,jsonb), public.pais_spal_pending_ranks(),
    public.pais_spal_finish_rank(uuid,boolean), public.pais_spal_apply_assignment(jsonb),
    public.pais_spal_owned_postings(text[]) from public, anon, authenticated;
grant execute on function public.pais_spal_change_promotion(text,text,jsonb), public.pais_spal_pending_ranks(),
    public.pais_spal_finish_rank(uuid,boolean), public.pais_spal_apply_assignment(jsonb),
    public.pais_spal_owned_postings(text[]) to service_role;

commit;
