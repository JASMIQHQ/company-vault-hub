-- Verification audit regression assertions; run only in isolated staging.
-- These checks are read-only and validate append-only semantics/provenance.
do $$
declare
  v_trigger text;
  v_guard text;
  v_unlinked_new_facts bigint;
begin
  select regexp_replace(lower(pg_get_functiondef(
    'public.audit_company_document_verification()'::regprocedure
  )), E'\\s+', ' ', 'g') into v_trigger;

  if position('returning id into v_attempt_id' in v_trigger)=0
     or position('verification_attempt_id, verified_at' in v_trigger)=0 then
    raise exception 'Verified facts must link the exact inserted successful attempt';
  end if;
  if position('if v_outcome=''verified'' and new.verified_doc_type is not null' in v_trigger)=0 then
    raise exception 'Fact insertion must be gated exclusively by verified outcome';
  end if;
  if position('delete from public.document_verified_facts' in v_trigger)>0 then
    raise exception 'Verification trigger must never delete historical facts';
  end if;
  if position('document_verification_attempts' in v_trigger)=0 then
    raise exception 'Trigger must append attempt records';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'public.prevent_verification_audit_mutation()'::regprocedure
  )), E'\\s+', ' ', 'g') into v_guard;
  if position('raise exception ''verification audit records are append-only''' in v_guard)=0 then
    raise exception 'Mutation guard must preserve append-only behavior';
  end if;
  if position('return old' in v_guard)>0 then
    raise exception 'Mutation guard must not permit fact deletion';
  end if;

  select count(*) into v_unlinked_new_facts
  from public.document_verified_facts f
  join public.document_verification_attempts a on a.id=f.verification_attempt_id
  where a.outcome<>'verified'
     or a.document_id<>f.document_id
     or a.company_id<>f.company_id
     or a.organization_id<>f.organization_id;
  if v_unlinked_new_facts<>0 then
    raise exception 'Found verified facts linked to nonmatching/nonverified attempts';
  end if;
end $$;
