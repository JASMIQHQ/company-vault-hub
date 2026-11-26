-- G41 verification audit integrity regression checks.
-- Execute against isolated staging after the additive G41 migration.

do $$
declare
  v_trigger text;
  v_writer text;
  v_wrapper text;
  v_fact_guard text;
  v_mutation_guard text;
  v_invalid_facts bigint;
begin
  select regexp_replace(lower(pg_get_functiondef(
    'public.audit_company_document_verification()'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_trigger;

  if position('current_setting(''jasmiq.verification_attempt_id''' in v_trigger) = 0
     or position('verification_attempt_id' in v_trigger) = 0
     or position('outcome = ''verified''' in v_trigger) = 0
     or position('case when v_outcome = ''verified'' then ''low'' else null end' in v_trigger) = 0 then
    raise exception 'Audit trigger must consume the exact attempt and use low confidence for direct-update fallback';
  end if;

  if position('set search_path to ''''' in v_trigger) = 0 then
    raise exception 'Audit trigger must use an empty search_path';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'private.write_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb)'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_writer;

  if position('for update' in v_writer) = 0
     or position('membership_source' in v_writer) = 0
     or position('is_active is true' in v_writer) = 0
     or position('organization_id = v_doc.organization_id' in v_writer) = 0
     or position('set_config(''jasmiq.verification_attempt_id''' in v_writer) = 0
     or position('insert into public.document_verification_attempts' in v_writer) = 0
     or position('update public.company_documents' in v_writer) = 0 then
    raise exception 'Private verification writer is missing lock, authorization, attempt context, or document transition';
  end if;

  if has_function_privilege(
       'authenticated',
       'private.write_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb)'::regprocedure,
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'private.write_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb)'::regprocedure,
       'EXECUTE'
     ) then
    raise exception 'Private verification writer must not be directly executable by API roles';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'public.record_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb)'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_wrapper;

  if position('private.write_document_verification' in v_wrapper) = 0
     or position('set search_path to ''''' in v_wrapper) = 0 then
    raise exception 'Public verification RPC must be a hardened wrapper around the private writer';
  end if;

  if has_function_privilege(
       'anon',
       'public.record_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb)'::regprocedure,
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.record_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb)'::regprocedure,
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.record_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb)'::regprocedure,
       'EXECUTE'
     ) then
    raise exception 'Public verification RPC must be service_role-only';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'private.guard_verified_fact_provenance()'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_fact_guard;

  if position('verification_attempt_id is null' in v_fact_guard) = 0
     or position('a.outcome = ''verified''' in v_fact_guard) = 0
     or position('a.document_id = new.document_id' in v_fact_guard) = 0
     or position('a.company_id = new.company_id' in v_fact_guard) = 0
     or position('a.organization_id = new.organization_id' in v_fact_guard) = 0
     or position('new.confidence is not distinct from coalesce(a.confidence, ''low'')' in v_fact_guard) = 0 then
    raise exception 'Fact guard must require exact successful attempt provenance';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'document_verified_facts'
      and indexname = 'document_verified_facts_attempt_uq'
      and indexdef ilike '%unique%'
  ) then
    raise exception 'One fact per verification attempt unique index is missing';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'public.prevent_verification_audit_mutation()'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_mutation_guard;

  if position('raise exception ''verification audit records are append-only''' in v_mutation_guard) = 0
     or position('set search_path to ''''' in v_mutation_guard) = 0 then
    raise exception 'Verification audit mutation guard must remain append-only and hardened';
  end if;

  select count(*)
  into v_invalid_facts
  from public.document_verified_facts f
  left join public.document_verification_attempts a
    on a.id = f.verification_attempt_id
  where f.verification_attempt_id is not null
    and (
      a.id is null
      or a.outcome <> 'verified'
      or a.document_id <> f.document_id
      or a.company_id <> f.company_id
      or a.organization_id <> f.organization_id
      or a.detected_doc_type is distinct from f.doc_type
      or a.detected_year is distinct from f.doc_year
      or a.detected_expiry_date is distinct from f.expiry_date
    );

  if v_invalid_facts <> 0 then
    raise exception 'Found % verified facts linked to invalid attempts', v_invalid_facts;
  end if;
end;
$$;
