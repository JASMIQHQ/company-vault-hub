-- Verification audit regression contract.
-- Run only in an isolated staging/test database after the corrective migration is applied.
-- These checks validate the installed trigger definition without mutating application rows.

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.audit_company_document_verification()'::regprocedure)
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
end $$;

-- Data-level acceptance queries to run after applying the migration:
-- 1. Must return zero rows: current mismatch documents represented as verified facts.
--    select f.document_id from public.document_verified_facts f
--    join public.company_documents d on d.id=f.document_id
--    where d.deleted_at is null and d.verification_status='mismatch';
-- 2. Every active verified document with a verified_doc_type should have a fact.
--    select d.id from public.company_documents d
--    where d.deleted_at is null and d.verification_status='verified'
--      and d.verified_doc_type is not null
--      and not exists (select 1 from public.document_verified_facts f where f.document_id=d.id);
