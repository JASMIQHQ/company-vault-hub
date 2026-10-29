-- Verification audit regression checks.
-- Run only in an isolated staging/test database after the corrective migration is applied.
-- Read-only assertions; no application rows are modified.

do $$
declare
  v_definition text;
  v_bad_mismatch_facts bigint;
  v_missing_verified_facts bigint;
  v_missing_mismatch_attempts bigint;
begin
  select regexp_replace(lower(pg_get_functiondef(
    'public.audit_company_document_verification()'::regprocedure
  )), '\\s+', ' ', 'g')
  into v_definition;

  if v_definition is null then
    raise exception 'Verification audit trigger function is missing';
  end if;

  if position('new.verification_status = ''verified''' in v_definition) = 0 then
    raise exception 'Trigger must gate verified-fact insertion on verified status';
  end if;

  if position('new.verification_status in (''verified'', ''mismatch'') and new.verified_doc_type is not null' in v_definition) > 0 then
    raise exception 'Mismatch status must not satisfy the verified-fact insertion condition';
  end if;

  if position('document_verification_attempts' in v_definition) = 0 then
    raise exception 'Trigger must continue writing verification attempts';
  end if;

  select count(*) into v_bad_mismatch_facts
  from public.document_verified_facts f
  join public.company_documents d on d.id = f.document_id
  where d.deleted_at is null
    and d.verification_status = 'mismatch';

  if v_bad_mismatch_facts <> 0 then
    raise exception 'Found % mismatch documents represented as verified facts', v_bad_mismatch_facts;
  end if;

  select count(*) into v_missing_verified_facts
  from public.company_documents d
  where d.deleted_at is null
    and d.verification_status = 'verified'
    and d.verified_doc_type is not null
    and not exists (
      select 1 from public.document_verified_facts f where f.document_id = d.id
    );

  if v_missing_verified_facts <> 0 then
    raise exception 'Found % verified documents missing verified-fact rows', v_missing_verified_facts;
  end if;

  select count(*) into v_missing_mismatch_attempts
  from public.company_documents d
  where d.deleted_at is null
    and d.verification_status = 'mismatch'
    and not exists (
      select 1
      from public.document_verification_attempts a
      where a.document_id = d.id
        and a.outcome = 'mismatch'
    );

  if v_missing_mismatch_attempts <> 0 then
    raise exception 'Found % mismatch documents without a mismatch attempt in audit history', v_missing_mismatch_attempts;
  end if;
end $$;
