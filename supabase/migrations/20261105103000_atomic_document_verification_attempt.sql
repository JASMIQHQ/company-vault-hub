-- Keep provider attempt creation, document transition, and verified-fact provenance
-- in one transaction. The trigger consumes the exact attempt inserted by this RPC.
begin;

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
    when new.verification_status in ('verified','mismatch') then new.verification_status
    else 'failed'
  end;

  -- The trusted RPC sets this transaction-local value after inserting the
  -- provider attempt. Validate it against this exact document and outcome.
  begin
    v_attempt_id := nullif(current_setting('jasmiq.verification_attempt_id', true), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Invalid verification attempt context';
  end;

  if v_attempt_id is not null then
    select * into v_attempt
    from public.document_verification_attempts
    where id = v_attempt_id
      and document_id = new.id
      and organization_id = new.organization_id
      and company_id = new.company_id
      and outcome = v_outcome
      and (v_outcome='failed' or (
        detected_doc_type is not distinct from new.verified_doc_type
        and detected_year is not distinct from new.verified_year
        and detected_expiry_date is not distinct from new.verified_expiry_date
      ));

    if not found then
      raise exception 'Verification attempt does not match document transition';
    end if;
  elsif new.verification_status is distinct from old.verification_status
     or new.verified_doc_type is distinct from old.verified_doc_type
     or new.verified_year is distinct from old.verified_year
     or new.verified_expiry_date is distinct from old.verified_expiry_date then
    insert into public.document_verification_attempts
      (document_id, organization_id, company_id, provider, model, outcome,
       detected_doc_type, detected_year, detected_expiry_date, confidence, created_at)
    values
      (new.id, new.organization_id, new.company_id, 'system_trigger', null,
       v_outcome, new.verified_doc_type, new.verified_year, new.verified_expiry_date,
       case when v_outcome='verified' then 'low' else null end, now())
    returning id into v_attempt_id;
  end if;

  -- Every successful verification call creates a fact linked to its exact
  -- attempt, including repeated verifications with unchanged extracted values.
  if v_attempt_id is not null and v_outcome='verified'
     and new.verified_doc_type is not null then
    insert into public.document_verified_facts
      (document_id, organization_id, company_id, doc_type, doc_year,
       expiry_date, confidence, verification_attempt_id, verified_at)
    values
      (new.id, new.organization_id, new.company_id, new.verified_doc_type,
       new.verified_year, new.verified_expiry_date, coalesce(v_attempt.confidence, 'low'), v_attempt_id,
       coalesce(new.verified_at, now()));
  end if;

  return new;
end;
$$;

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
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.company_documents%rowtype;
  v_attempt_id uuid;
begin
  if p_outcome is null or p_outcome not in ('verified','mismatch','failed') then
    raise exception 'Unsupported verification outcome';
  end if;

  select * into v_doc
  from public.company_documents
  where id=p_document_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Document not found';
  end if;

  insert into public.document_verification_attempts
    (document_id, organization_id, company_id, requested_by, provider, model,
     outcome, detected_doc_type, detected_year, detected_expiry_date, confidence,
     error_stage, error_message, diagnostics, created_at)
  values
    (v_doc.id, v_doc.organization_id, v_doc.company_id, p_requested_by, p_provider,
     p_model, p_outcome, p_detected_doc_type, p_detected_year,
     p_detected_expiry_date, p_confidence, p_error_stage, p_error_message,
     p_diagnostics, now())
  returning id into v_attempt_id;

  perform pg_catalog.set_config('jasmiq.verification_attempt_id', v_attempt_id::text, true);

  if p_outcome='failed' then
    update public.company_documents
    set verification_status='failed', verified_at=now()
    where id=v_doc.id;
  else
    update public.company_documents
    set verification_status=p_outcome,
        verified_doc_type=p_detected_doc_type,
        verified_year=p_detected_year,
        verified_expiry_date=p_detected_expiry_date,
        verified_at=now()
    where id=v_doc.id;
  end if;

  return v_attempt_id;
end;
$$;

revoke all on function public.record_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb) to service_role;

commit;
