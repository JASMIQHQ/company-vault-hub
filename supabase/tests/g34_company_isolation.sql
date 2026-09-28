-- G34 company-isolation regression checks.
-- Run in a Supabase test database with representative organization/company/member data.
-- These assertions deliberately use the authorization primitive rather than trusting UI context.

begin;

do $$
declare
  v_profile uuid;
  v_org uuid;
  v_company_a uuid;
  v_company_b uuid;
begin
  select id into v_profile from public.profiles limit 1;
  select organization_id into v_org from public.companies limit 1;
  select id into v_company_a from public.companies where organization_id=v_org order by id limit 1;
  select id into v_company_b from public.companies where organization_id=v_org and id<>v_company_a order by id limit 1;

  if v_profile is null or v_company_a is null or v_company_b is null then
    raise exception 'G34 fixture requires one profile and two companies in the same organization';
  end if;

  if not private.is_company_member(v_company_a) then
    raise exception 'G34 fixture: expected backfilled membership for company A';
  end if;

  if not private.is_company_member(v_company_b) then
    raise exception 'G34 fixture: expected backfilled membership for company B';
  end if;
end $$;

rollback;
