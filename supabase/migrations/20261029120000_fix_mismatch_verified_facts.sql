-- Correct verification audit semantics without destroying successful history.
-- Mismatch/failure outcomes append attempts only. Existing facts are immutable.
begin;

-- Backfill only currently verified documents that have no fact. Legacy facts are
-- deliberately preserved; provenance gaps are handled as review items, not deleted.
insert into public.document_verified_facts
  (document_id, organization_id, company_id, doc_type, doc_year, expiry_date, confidence, verification_attempt_id, verified_at)
select d.id, d.organization_id, d.company_id, d.verified_doc_type, d.verified_year,
       d.verified_expiry_date, coalesce(a.confidence, 'low'), a.id, coalesce(d.verified_at, a.created_at, now())
from public.company_documents d
left join lateral (
  select va.id, va.created_at, va.confidence
  from public.document_verification_attempts va
  where va.document_id=d.id and va.outcome='verified'
  order by va.created_at desc
  limit 1
) a on true
where d.deleted_at is null
  and d.verification_status='verified'
  and d.verified_doc_type is not null
  -- Never create a new trusted fact without a real successful attempt.
  and a.id is not null
  and not exists (select 1 from public.document_verified_facts f where f.document_id=d.id);

-- Preserve the append-only mutation guard. No mismatch-specific DELETE exception.
create or replace function public.prevent_verification_audit_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  raise exception 'Verification audit records are append-only';
end;
$$;

-- Every status/metadata transition appends an attempt. Only a verified outcome
-- with a document type appends a fact, linked to the exact attempt just created.
create or replace function public.audit_company_document_verification()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_attempt_id uuid;
  v_outcome text;
begin
  if new.verification_status is distinct from old.verification_status
     or new.verified_doc_type is distinct from old.verified_doc_type
     or new.verified_year is distinct from old.verified_year
     or new.verified_expiry_date is distinct from old.verified_expiry_date then
    v_outcome := case
      when new.verification_status in ('verified','mismatch') then new.verification_status
      else 'failed'
    end;

    insert into public.document_verification_attempts
      (document_id, organization_id, company_id, provider, model, outcome,
       detected_doc_type, detected_year, detected_expiry_date, confidence, created_at)
    values
      (new.id, new.organization_id, new.company_id, 'system_trigger', null,
       v_outcome, new.verified_doc_type, new.verified_year, new.verified_expiry_date,
       case when v_outcome='verified' then 'low' else null end, now())
    returning id into v_attempt_id;

    if v_outcome='verified' and new.verified_doc_type is not null then
      insert into public.document_verified_facts
        (document_id, organization_id, company_id, doc_type, doc_year,
         expiry_date, confidence, verification_attempt_id, verified_at)
      values
        (new.id, new.organization_id, new.company_id, new.verified_doc_type,
         new.verified_year, new.verified_expiry_date, 'high', v_attempt_id,
         coalesce(new.verified_at, now()));
    end if;
  end if;
  return new;
end;
$$;

commit;
