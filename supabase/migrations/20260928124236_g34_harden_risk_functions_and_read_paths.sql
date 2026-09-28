create or replace function public.calculate_tender_compliance(p_tender_id uuid)
returns numeric language plpgsql security definer set search_path=''
as $$
declare total_requirements numeric; matched_requirements numeric; compliance numeric; v_company_id uuid;
begin
 select t.company_id into v_company_id from public.tenders t where t.id=p_tender_id;
 if v_company_id is null or not private.is_company_member(v_company_id) then raise exception 'forbidden' using errcode='42501'; end if;
 select count(*) into total_requirements from public.tender_requirements where tender_id=p_tender_id;
 if total_requirements=0 then update public.tenders set compliance_percentage=0 where id=p_tender_id; return 0; end if;
 select count(*) into matched_requirements from public.tender_requirements where tender_id=p_tender_id and status='matched';
 compliance:=round((matched_requirements/total_requirements)*100,2);
 update public.tenders set compliance_percentage=compliance where id=p_tender_id;
 return compliance;
end; $$;
create or replace function public.fail_document(p_document uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_company_id uuid;
begin
 select company_id into v_company_id from public.company_documents where id=p_document;
 if v_company_id is null or not private.is_company_member(v_company_id) then raise exception 'forbidden' using errcode='42501'; end if;
 update public.company_documents set analysis_status='failed',updated_at=now() where id=p_document;
 return found;
end; $$;
create or replace function public.register_document_upload(p_company_id uuid,p_category text,p_document_type text,p_document_name text,p_original_filename text,p_storage_path text,p_mime_type text,p_file_size bigint,p_sha256_hash text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_document_id uuid; v_organization_id uuid;
begin
 v_organization_id:=public.current_organization_id();
 if v_organization_id is null or not private.is_company_member(p_company_id) then raise exception 'forbidden' using errcode='42501'; end if;
 insert into public.company_documents(organization_id,company_id,uploaded_by,category,document_type,document_name,original_filename,storage_path,mime_type,file_size,sha256_hash,analysis_status,document_status,version)
 values(v_organization_id,p_company_id,public.current_profile_id(),p_category,p_document_type,p_document_name,p_original_filename,p_storage_path,p_mime_type,p_file_size,p_sha256_hash,'pending','active',1)
 returning id into v_document_id;
 return v_document_id;
end; $$;
create or replace function public.supersede_existing_document(p_company_id uuid,p_document_type text)
returns integer language plpgsql security definer set search_path=''
as $$
declare v_organization_id uuid; v_count integer;
begin
 v_organization_id:=public.current_organization_id();
 if v_organization_id is null or not private.is_company_member(p_company_id) then raise exception 'forbidden' using errcode='42501'; end if;
 update public.company_documents set document_status='superseded',updated_at=now() where company_id=p_company_id and organization_id=v_organization_id and upper(document_type)=upper(trim(p_document_type)) and document_status='active';
 get diagnostics v_count=row_count; return v_count;
end; $$;
create or replace function public.get_document(p_document uuid)
returns table(id uuid,organization_id uuid,category text,document_type text,document_name text,analysis_status public.document_analysis_status,analysis_json jsonb,expiry_date date,document_status text)
language sql stable security invoker set search_path=''
as $$ select cd.id,cd.organization_id,cd.category,cd.document_type,cd.document_name,cd.analysis_status,cd.analysis_json,cd.expiry_date,cd.document_status::text from public.company_documents cd where cd.id=p_document; $$;
create or replace function public.get_documents_by_category(p_category text) returns setof public.company_documents language sql stable security invoker set search_path='' as $$ select cd.* from public.company_documents cd where cd.category=p_category and cd.document_status::text='active' order by cd.created_at desc; $$;
create or replace function public.get_documents_for_review() returns setof public.company_documents language sql stable security invoker set search_path='' as $$ select cd.* from public.company_documents cd where cd.analysis_status='requires_review' order by cd.created_at desc; $$;
create or replace function public.get_expired_documents() returns setof public.company_documents language sql stable security invoker set search_path='' as $$ select cd.* from public.company_documents cd where cd.expiry_date<current_date and cd.document_status::text='active' order by cd.expiry_date; $$;
create or replace function public.get_expiring_documents(days_ahead integer default 30) returns setof public.company_documents language sql stable security invoker set search_path='' as $$ select cd.* from public.company_documents cd where cd.expiry_date is not null and cd.expiry_date<=current_date+days_ahead and cd.document_status::text='active' order by cd.expiry_date; $$;
create or replace function public.get_pending_analysis() returns setof public.company_documents language sql stable security invoker set search_path='' as $$ select cd.* from public.company_documents cd where cd.analysis_status in ('pending','processing') order by cd.created_at; $$;
create or replace function public.get_tender_summary(p_tender uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('requirements',(select count(*) from public.tender_requirements where tender_id=p_tender),'matched',(select count(*) from public.tender_requirements where tender_id=p_tender and status='matched'),'missing',(select count(*) from public.tender_requirements where tender_id=p_tender and status='missing'),'manual_review',(select count(*) from public.tender_requirements where tender_id=p_tender and status='manual_review')) where exists(select 1 from public.tenders t where t.id=p_tender); $$;
create or replace function public.get_upcoming_expiries(p_org uuid) returns table(document_name text,document_type text,category text,expiry_date date,days_remaining integer) language sql stable security invoker set search_path='' as $$ select cd.document_name,cd.document_type,cd.category,cd.expiry_date,(cd.expiry_date-current_date)::integer from public.company_documents cd where cd.organization_id=p_org and cd.document_status='active' and cd.expiry_date is not null order by cd.expiry_date asc limit 20; $$;
create or replace function public.get_expiring_documents(p_org uuid,p_days integer default 30) returns table(id uuid,document_name text,document_type text,expiry_date date,days_remaining integer) language sql stable security invoker set search_path='' as $$ select cd.id,cd.document_name,cd.document_type,cd.expiry_date,(cd.expiry_date-current_date)::integer from public.company_documents cd where cd.organization_id=p_org and cd.expiry_date is not null and cd.expiry_date<=current_date+p_days and cd.document_status='active' order by cd.expiry_date limit 20; $$;
revoke execute on function public.calculate_tender_compliance(uuid) from public,anon;
revoke execute on function public.fail_document(uuid) from public,anon;
revoke execute on function public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text) from public,anon;
revoke execute on function public.supersede_existing_document(uuid,text) from public,anon;
revoke execute on function public.get_document(uuid) from public,anon;
revoke execute on function public.get_documents_by_category(text) from public,anon;
revoke execute on function public.get_documents_for_review() from public,anon;
revoke execute on function public.get_expired_documents() from public,anon;
revoke execute on function public.get_expiring_documents(integer) from public,anon;
revoke execute on function public.get_pending_analysis() from public,anon;
revoke execute on function public.get_tender_summary(uuid) from public,anon;
revoke execute on function public.get_upcoming_expiries(uuid) from public,anon;
revoke execute on function public.get_expiring_documents(uuid,integer) from public,anon;