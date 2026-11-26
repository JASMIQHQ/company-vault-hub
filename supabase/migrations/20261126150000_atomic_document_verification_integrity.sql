-- JASMIQ G41: atomic verification writes and immutable fact provenance.
-- Requires G40 company_membership_provenance (20261126135522).

begin;

create or replace function public.prevent_verification_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Verification audit records are append-only';
end;
$$;

revoke all on function public.prevent_verification_audit_mutation() from public, anon, authenticated, service_role;

create or replace function private.guard_verified_fact_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.document_verification_attempts%rowtype;
begin
  if new.verification_attempt_id is null then
    raise exception 'Verified facts require a verification attempt';
  end if;

  select *
  into v_attempt
  from public.document_verification_attempts a
  where a.id = new.verification_attempt_id
    and a.outcome = 'verified'
    and a.document_id = new.document_id
    and a.company_id = new.company_id
    and a.organization_id = new.organization_id
    and a.detected_doc_type is not distinct from new.doc_type
    and a.detected_year is not distinct from new.doc_year
    and a.detected_expiry_date is not distinct from new.expiry_date
    and new.confidence is not distinct from coalesce(a.confidence, 'low');

  if not found then
    raise exception 'Verified fact does not match a successful verification attempt';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_verified_fact_provenance() from public, anon, authenticated, service_role;

drop trigger if exists trg_document_verified_facts_require_success
  on public.document_verified_facts;

create trigger trg_document_verified_facts_require_success
before insert on public.document_verified_facts
for each row execute function private.guard_verified_fact_provenance();

do $$
begin
  if exists (
    select 1
    from public.document_verified_facts
    where verification_attempt_id is not null
    group by verification_attempt_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate verified facts already reference the same attempt; reconcile before adding unique provenance index';
  end if;
end;
$$;

create unique index if not exists document_verified_facts_attempt_uq
  on public.document_verified_facts (verification_attempt_id)
  where verification_attempt_id is not null;

create or replace function public.audit_company_document_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
  v_outcome text;
  v_attempt public.document_verification_attempts%rowtype;
begin
  v_outcome := case
    when new.verification_status in ('verified', 'mismatch') then new.verification_status
    else 'failed'
  end;

  begin
    v_attempt_id := nullif(
      pg_catalog.current_setting('jasmiq.verification_attempt_id', true),
      ''
    )::uuid;
  exception when invalid_text_representation then
    raise exception 'Invalid verification attempt context';
  end;

  if v_attempt_id is not null then
    select *
    into v_attempt
    from public.document_verification_attempts a
    where a.id = v_attempt_id
      and a.document_id = new.id
      and a.organization_id = new.organization_id
      and a.company_id = new.company_id
      and a.outcome = v_outcome
      and (
        v_outcome = 'failed'
        or (
          a.detected_doc_type is not distinct from new.verified_doc_type
          and a.detected_year is not distinct from new.verified_year
          and a.detected_expiry_date is not distinct from new.verified_expiry_date
        )
      );

    if not found then
      raise exception 'Verification attempt does not match document transition';
    end if;
  elsif new.verification_status is distinct from old.verification_status
     or new.verified_doc_type is distinct from old.verified_doc_type
     or new.verified_year is distinct from old.verified_year
     or new.verified_expiry_date is distinct from old.verified_expiry_date then
    insert into public.document_verification_attempts (
      document_id,
      organization_id,
      company_id,
      provider,
      model,
      outcome,
      detected_doc_type,
      detected_year,
      detected_expiry_date,
      confidence,
      created_at
    )
    values (
      new.id,
      new.organization_id,
      new.company_id,
      'system_trigger',
      null,
      v_outcome,
      new.verified_doc_type,
      new.verified_year,
      new.verified_expiry_date,
      case when v_outcome = 'verified' then 'low' else null end,
      now()
    )
    returning id into v_attempt_id;

    select *
    into v_attempt
    from public.document_verification_attempts a
    where a.id = v_attempt_id;
  end if;

  if v_attempt_id is not null
     and v_outcome = 'verified'
     and new.verified_doc_type is not null then
    insert into public.document_verified_facts (
      document_id,
      organization_id,
      company_id,
      doc_type,
      doc_year,
      expiry_date,
      confidence,
      verification_attempt_id,
      verified_at
    )
    values (
      new.id,
      new.organization_id,
      new.company_id,
      new.verified_doc_type,
      new.verified_year,
      new.verified_expiry_date,
      coalesce(v_attempt.confidence, 'low'),
      v_attempt_id,
      coalesce(new.verified_at, now())
    );
  end if;

  return new;
end;
$$;

revoke all on function public.audit_company_document_verification() from public, anon, authenticated, service_role;

create or replace function private.write_document_verification(
  p_document_id uuid,
  p_requested_by uuid,
  p_provider text,
  p_model text,
  p_outcome text,
  p_detected_doc_type text default null,
  p_detected_year integer default null,
  p_detected_expiry_date date default null,
  p_confidence text default null,
  p_error_stage text default null,
  p_error_message text default null,
  p_diagnostics jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.company_documents%rowtype;
  v_attempt_id uuid;
begin
  if p_outcome is null or p_outcome not in ('verified', 'mismatch', 'failed') then
    raise exception 'Unsupported verification outcome' using errcode = '22023';
  end if;

  if p_requested_by is null or nullif(trim(p_provider), '') is null then
    raise exception 'Verification actor and provider are required' using errcode = '22023';
  end if;

  if p_provider not in ('gemini', 'anthropic', 'stub', 'human') then
    raise exception 'Unsupported verification provider' using errcode = '22023';
  end if;

  if p_confidence is not null and p_confidence not in ('high', 'low') then
    raise exception 'Unsupported confidence value' using errcode = '22023';
  end if;

  if p_outcome in ('verified', 'mismatch') and p_detected_doc_type is null then
    raise exception 'A detected document type is required for verified or mismatch outcomes' using errcode = '22023';
  end if;

  if p_outcome = 'verified'
     and (p_confidence is distinct from 'high' or p_detected_doc_type = 'OTHER') then
    raise exception 'Verified outcomes require a high-confidence non-OTHER classification' using errcode = '22023';
  end if;

  select *
  into v_doc
  from public.company_documents d
  where d.id = p_document_id
    and d.deleted_at is null
  for update;

  if not found then
    raise exception 'Document not found';
  end if;

  if not exists (
    select 1
    from public.companies c
    join public.company_members cm
      on cm.company_id = c.id
     and cm.organization_id = c.organization_id
    join public.organization_members om
      on om.organization_id = cm.organization_id
     and om.profile_id = cm.profile_id
    where c.id = v_doc.company_id
      and c.organization_id = v_doc.organization_id
      and c.is_active is true
      and cm.profile_id = p_requested_by
      and (
        cm.membership_source = 'explicit'
        or (cm.membership_source = 'owner' and om.is_owner is true)
      )
  ) then
    raise exception 'Verification actor is not an authorized active company member'
      using errcode = '42501';
  end if;

  insert into public.document_verification_attempts (
    document_id,
    organization_id,
    company_id,
    requested_by,
    provider,
    model,
    outcome,
    detected_doc_type,
    detected_year,
    detected_expiry_date,
    confidence,
    error_stage,
    error_message,
    diagnostics,
    created_at
  )
  values (
    v_doc.id,
    v_doc.organization_id,
    v_doc.company_id,
    p_requested_by,
    p_provider,
    p_model,
    p_outcome,
    p_detected_doc_type,
    p_detected_year,
    p_detected_expiry_date,
    p_confidence,
    p_error_stage,
    p_error_message,
    p_diagnostics,
    now()
  )
  returning id into v_attempt_id;

  perform pg_catalog.set_config(
    'jasmiq.verification_attempt_id',
    v_attempt_id::text,
    true
  );

  if p_outcome = 'failed' then
    update public.company_documents
    set verification_status = 'failed',
        verified_at = now()
    where id = v_doc.id;
  else
    update public.company_documents
    set verification_status = p_outcome,
        verified_doc_type = p_detected_doc_type,
        verified_year = p_detected_year,
        verified_expiry_date = p_detected_expiry_date,
        verified_at = now()
    where id = v_doc.id;
  end if;

  return v_attempt_id;
end;
$$;

revoke all on function private.write_document_verification(
  uuid, uuid, text, text, text, text, integer, date, text, text, text, jsonb
) from public, anon, authenticated, service_role;

create or replace function public.record_document_verification(
  p_document_id uuid,
  p_requested_by uuid,
  p_provider text,
  p_model text,
  p_outcome text,
  p_detected_doc_type text default null,
  p_detected_year integer default null,
  p_detected_expiry_date date default null,
  p_confidence text default null,
  p_error_stage text default null,
  p_error_message text default null,
  p_diagnostics jsonb default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.write_document_verification(
    p_document_id,
    p_requested_by,
    p_provider,
    p_model,
    p_outcome,
    p_detected_doc_type,
    p_detected_year,
    p_detected_expiry_date,
    p_confidence,
    p_error_stage,
    p_error_message,
    p_diagnostics
  );
$$;

revoke all on function public.record_document_verification(
  uuid, uuid, text, text, text, text, integer, date, text, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.record_document_verification(
  uuid, uuid, text, text, text, text, integer, date, text, text, text, jsonb
) to service_role;

-- Backfill only from the latest matching verified attempt. Historical facts
-- remain immutable; no fact is invented where an auditable successful attempt
-- does not exist.
insert into public.document_verified_facts (
  document_id,
  organization_id,
  company_id,
  doc_type,
  doc_year,
  expiry_date,
  confidence,
  verification_attempt_id,
  verified_at
)
select
  d.id,
  d.organization_id,
  d.company_id,
  d.verified_doc_type,
  d.verified_year,
  d.verified_expiry_date,
  coalesce(a.confidence, 'low'),
  a.id,
  coalesce(d.verified_at, a.created_at, now())
from public.company_documents d
join lateral (
  select
    va.id,
    va.created_at,
    va.confidence,
    va.outcome,
    va.detected_doc_type,
    va.detected_year,
    va.detected_expiry_date
  from public.document_verification_attempts va
  where va.document_id = d.id
    and va.company_id = d.company_id
    and va.organization_id = d.organization_id
  order by va.created_at desc, va.id desc
  limit 1
) a on true
where d.deleted_at is null
  and d.verification_status = 'verified'
  and d.verified_doc_type is not null
  and a.outcome = 'verified'
  and a.detected_doc_type is not distinct from d.verified_doc_type
  and a.detected_year is not distinct from d.verified_year
  and a.detected_expiry_date is not distinct from d.verified_expiry_date
  and not exists (
    select 1
    from public.document_verified_facts f
    where f.verification_attempt_id = a.id
  );

commit;
