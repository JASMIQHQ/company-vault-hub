-- Verification audit regression assertions; run only in isolated staging.
-- Structural safeguards only; lifecycle behavior is exercised by the staging replay
-- acceptance procedure before this migration is considered production-ready.
do $$
declare
  v_trigger text;
  v_rpc text;
  v_guard text;
  v_unlinked_new_facts bigint;
begin
  select regexp_replace(lower(pg_get_functiondef(
    'public.audit_company_document_verification()'::regprocedure
  )), E'\\s+', ' ', 'g') into v_trigger;

  if position('current_setting(''jasmiq.verification_attempt_id''' in v_trigger)=0
     or position('verification_attempt_id, verified_at' in v_trigger)=0 then
    raise exception 'Trigger must consume the RPC attempt id and link facts to it';
  end if;
  if position('verification_attempt_id' in v_trigger)=0
     or position('outcome=''verified''' in v_trigger)=0 then
    raise exception 'Fact insertion must be restricted to verified outcomes';
  end if;
  if position('coalesce(v_attempt.confidence, ''low'')' in v_trigger)=0 then
    raise exception 'Verified facts must preserve attempt confidence rather than assume high confidence';
  end if;
  if position('delete from public.document_verified_facts' in v_trigger)>0 then
    raise exception 'Verification trigger must never delete historical facts';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'public.record_document_verification(uuid,uuid,text,text,text,text,integer,date,text,text,text,jsonb)'::regprocedure
  )), E'\\s+', ' ', 'g') into v_rpc;
  if position('for update' in v_rpc)=0
     or position('set_config(''jasmiq.verification_attempt_id''' in v_rpc)=0
     or position('return v_attempt_id' in v_rpc)=0 then
    raise exception 'Verification RPC must lock document, set exact attempt context, and return attempt id';
  end if;
  if position('insert into public.document_verification_attempts' in v_rpc)=0
     or position('update public.company_documents' in v_rpc)=0 then
    raise exception 'Verification attempt and document transition must share one RPC transaction';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'public.prevent_verification_audit_mutation()'::regprocedure
  )), E'\\s+', ' ', 'g') into v_guard;
  if position('raise exception ''verification audit records are append-only''' in v_guard)=0 then
    raise exception 'Mutation guard must preserve append-only behavior';
  end if;

  select count(*) into v_unlinked_new_facts
  from public.document_verified_facts f
  left join public.document_verification_attempts a on a.id=f.verification_attempt_id
  where f.verification_attempt_id is not null
    and (a.id is null or a.outcome<>'verified'
      or a.document_id<>f.document_id
      or a.company_id<>f.company_id
      or a.organization_id<>f.organization_id);
  if v_unlinked_new_facts<>0 then
    raise exception 'Found verified facts linked to nonmatching/nonverified attempts';
  end if;
end $$;
