begin;

-- No anonymous client should execute SECURITY DEFINER routines in the public API.
revoke execute on all functions in schema public from anon;

-- Trigger/helper functions are database-internal, not Data API endpoints.
revoke execute on function public.audit_company_document_verification() from public, authenticated;
revoke execute on function public.prevent_verification_audit_mutation() from public, authenticated;
revoke execute on function public.preserve_verified_facts_on_verification_failure() from public, authenticated;
revoke execute on function public.refresh_compliance() from public, authenticated;
revoke execute on function public.rls_auto_enable() from public, authenticated;

-- Organization-parameterized RPCs must prove membership before returning data.
create or replace function public.calculate_company_completion(p_org uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare score integer := 0;
begin
  if not is_org_member(p_org) then raise exception 'forbidden'; end if;
  if exists(select 1 from company_documents where organization_id=p_org and category='Company Registration') then score:=score+20; end if;
  if exists(select 1 from company_documents where organization_id=p_org and category='Tax') then score:=score+20; end if;
  if exists(select 1 from company_documents where organization_id=p_org and category='Financial') then score:=score+20; end if;
  if exists(select 1 from company_documents where organization_id=p_org and category='Compliance') then score:=score+20; end if;
  if exists(select 1 from company_documents where organization_id=p_org and category='Personnel') then score:=score+20; end if;
  return score;
end;
$$;

create or replace function public.get_dashboard_summary(p_org uuid)
returns table(documents bigint, active_tenders bigint, expiring_documents bigint, generated_documents bigint)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not is_org_member(p_org) then raise exception 'forbidden'; end if;
  return query select
    (select count(*) from company_documents where organization_id=p_org and document_status='active'),
    (select count(*) from tenders where organization_id=p_org and status='active'),
    (select count(*) from company_documents where organization_id=p_org and expiry_date<=current_date+interval '90 days' and document_status='active'),
    (select count(*) from generated_documents where organization_id=p_org);
end;
$$;

create or replace function public.get_organization_dashboard_stats(p_organization_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not is_org_member(p_organization_id) then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'documents',(select count(*) from company_documents where organization_id=p_organization_id),
    'active_documents',(select count(*) from company_documents where organization_id=p_organization_id and document_status='active'),
    'expiring_documents',(select count(*) from company_documents where organization_id=p_organization_id and expiry_date is not null and expiry_date<=current_date+30),
    'tenders',(select count(*) from tenders where organization_id=p_organization_id),
    'analyzed_tenders',(select count(*) from tenders where organization_id=p_organization_id and analysis_status='analyzed'),
    'requirements',(select count(*) from tender_requirements where organization_id=p_organization_id),
    'matches',(select count(*) from compliance_matches where organization_id=p_organization_id),
    'generated_documents',(select count(*) from generated_documents where organization_id=p_organization_id)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_expiring_documents(p_org uuid, p_days integer default 30)
returns table(id uuid, document_name text, document_type text, expiry_date date, days_remaining integer)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not is_org_member(p_org) then raise exception 'forbidden'; end if;
  return query select cd.id,cd.document_name,cd.document_type,cd.expiry_date,(cd.expiry_date-current_date)::integer
  from company_documents cd where cd.organization_id=p_org and cd.expiry_date is not null and cd.expiry_date<=current_date+p_days and cd.document_status='active' order by cd.expiry_date limit 20;
end;
$$;

create or replace function public.get_upcoming_expiries(p_org uuid)
returns table(document_name text, document_type text, category text, expiry_date date, days_remaining integer)
language sql security definer set search_path = public, pg_temp
as $$
select document_name,document_type,category,expiry_date,expiry_date-current_date
from company_documents where organization_id=p_org and document_status='active' and expiry_date is not null and is_org_member(p_org)
order by expiry_date asc limit 20;
$$;

create or replace function public.get_tender_summary(p_tender uuid)
returns jsonb language sql security definer set search_path = public, pg_temp
as $$
select jsonb_build_object(
 'requirements',(select count(*) from tender_requirements where tender_id=p_tender),
 'matched',(select count(*) from tender_requirements where tender_id=p_tender and status='matched'),
 'missing',(select count(*) from tender_requirements where tender_id=p_tender and status='missing'),
 'manual_review',(select count(*) from tender_requirements where tender_id=p_tender and status='manual_review')
) where exists(select 1 from tenders t where t.id=p_tender and is_org_member(t.organization_id));
$$;

create or replace function public.calculate_tender_compliance(p_tender_id uuid)
returns numeric language plpgsql security definer set search_path = public, pg_temp
as $$
declare total_requirements numeric; matched_requirements numeric; compliance numeric;
begin
  if not exists(select 1 from tenders t where t.id=p_tender_id and is_org_member(t.organization_id)) then raise exception 'forbidden'; end if;
  select count(*) into total_requirements from tender_requirements where tender_id=p_tender_id;
  if total_requirements=0 then update tenders set compliance_percentage=0 where id=p_tender_id; return 0; end if;
  select count(*) into matched_requirements from tender_requirements where tender_id=p_tender_id and status='matched';
  compliance:=round((matched_requirements/total_requirements)*100,2);
  update tenders set compliance_percentage=compliance where id=p_tender_id;
  return compliance;
end;
$$;

create or replace function public.check_duplicate_document(p_org uuid, p_hash text)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not is_org_member(p_org) then raise exception 'forbidden'; end if;
  return exists(select 1 from company_documents where organization_id=p_org and sha256_hash=p_hash and document_status='active' and version=(select max(version) from company_documents c2 where c2.organization_id=company_documents.organization_id and c2.sha256_hash=company_documents.sha256_hash));
end;
$$;

-- The membership predicates themselves are safe read helpers, but never anonymous.
revoke execute on function public.is_org_member(uuid) from public;
revoke execute on function public.is_org_owner(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.is_org_owner(uuid) to authenticated, service_role;

-- Authenticated callers may use read RPCs; the functions now enforce membership.
grant execute on function public.calculate_company_completion(uuid) to authenticated, service_role;
grant execute on function public.get_dashboard_summary(uuid) to authenticated, service_role;
grant execute on function public.get_organization_dashboard_stats(uuid) to authenticated, service_role;
grant execute on function public.get_expiring_documents(uuid,integer) to authenticated, service_role;
grant execute on function public.get_upcoming_expiries(uuid) to authenticated, service_role;
grant execute on function public.get_tender_summary(uuid) to authenticated, service_role;
grant execute on function public.calculate_tender_compliance(uuid) to authenticated, service_role;
grant execute on function public.check_duplicate_document(uuid,text) to authenticated, service_role;

commit;
