create or replace function public.create_company_for_current_user(p_organization_id uuid,p_legal_name text,p_registration_number text default null,p_tax_identification_number text default null)
returns public.companies language plpgsql security definer set search_path=''
as $$
declare v_company public.companies;
begin
 if not public.is_org_owner(p_organization_id) then raise exception 'forbidden' using errcode='42501'; end if;
 insert into public.companies(organization_id,legal_name,registration_number,tax_identification_number)
 values(p_organization_id,trim(p_legal_name),nullif(trim(p_registration_number),''),nullif(trim(p_tax_identification_number),'')) returning * into v_company;
 insert into public.company_members(company_id,profile_id,organization_id,role)
 values(v_company.id,public.current_profile_id(),v_company.organization_id,'owner')
 on conflict(company_id,profile_id) do update set role='owner';
 return v_company;
end; $$;
revoke execute on function public.create_company_for_current_user(uuid,text,text,text) from public,anon;
grant execute on function public.create_company_for_current_user(uuid,text,text,text) to authenticated;