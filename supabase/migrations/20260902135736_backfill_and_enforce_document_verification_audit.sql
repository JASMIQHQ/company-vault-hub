insert into public.document_verified_facts (document_id, organization_id, company_id, doc_type, doc_year, expiry_date, confidence, verified_at)
select d.id, d.organization_id, d.company_id, d.verified_doc_type, d.verified_year, d.verified_expiry_date, 'high', coalesce(d.verified_at, now())
from public.company_documents d
where d.deleted_at is null
  and d.verification_status in ('verified','mismatch')
  and d.verified_doc_type is not null
  and not exists (select 1 from public.document_verified_facts f where f.document_id=d.id);

insert into public.document_verification_attempts (document_id, organization_id, company_id, provider, model, outcome, detected_doc_type, detected_year, detected_expiry_date, confidence, created_at)
select d.id, d.organization_id, d.company_id, 'historical', null,
       case when d.verification_status='verified' then 'verified' else 'mismatch' end,
       d.verified_doc_type, d.verified_year, d.verified_expiry_date, 'high', coalesce(d.verified_at, now())
from public.company_documents d
where d.deleted_at is null
  and d.verification_status in ('verified','mismatch')
  and not exists (select 1 from public.document_verification_attempts a where a.document_id=d.id);

create or replace function public.audit_company_document_verification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.verification_status is distinct from old.verification_status
     or new.verified_doc_type is distinct from old.verified_doc_type
     or new.verified_year is distinct from old.verified_year
     or new.verified_expiry_date is distinct from old.verified_expiry_date then
    insert into public.document_verification_attempts(document_id, organization_id, company_id, provider, model, outcome, detected_doc_type, detected_year, detected_expiry_date, confidence, created_at)
    values(new.id,new.organization_id,new.company_id,'system_trigger',null,
      case when new.verification_status in ('verified','mismatch') then new.verification_status else 'failed' end,
      new.verified_doc_type,new.verified_year,new.verified_expiry_date,
      case when new.verification_status in ('verified','mismatch') then 'high' else null end,now());

    if new.verification_status in ('verified','mismatch') and new.verified_doc_type is not null then
      insert into public.document_verified_facts(document_id,organization_id,company_id,doc_type,doc_year,expiry_date,confidence,verified_at)
      values(new.id,new.organization_id,new.company_id,new.verified_doc_type,new.verified_year,new.verified_expiry_date,'high',coalesce(new.verified_at,now()));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_company_document_verification on public.company_documents;
create trigger audit_company_document_verification after update on public.company_documents for each row execute function public.audit_company_document_verification();
