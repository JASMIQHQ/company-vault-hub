-- Structural and security regression checks for G40 membership provenance.
do $$
declare
  v_member text;
  v_profile text;
  v_org_member text;
  v_org_owner text;
  v_create text;
  v_default text;
  v_nullable text;
begin
  select column_default, is_nullable
    into v_default, v_nullable
  from information_schema.columns
  where table_schema='public'
    and table_name='company_members'
    and column_name='membership_source';

  if not found or v_nullable <> 'NO' or v_default is null then
    raise exception 'membership_source must be NOT NULL with a safe legacy_backfill default';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.company_members'::regclass
      and conname='company_members_membership_source_check'
      and pg_get_constraintdef(oid) like '%legacy_backfill%'
      and pg_get_constraintdef(oid) like '%owner%'
      and pg_get_constraintdef(oid) like '%explicit%'
  ) then
    raise exception 'membership_source constraint is incomplete';
  end if;

  select pg_get_functiondef('private.is_company_member(uuid)'::regprocedure) into v_member;
  if position('membership_source' in v_member)=0
     or position('legacy_backfill' in v_member)>0
     or position('explicit' in v_member)=0
     or position('owner' in v_member)=0
     or position('is_active' in v_member)=0
     or position('organization_id = c.organization_id' in v_member)=0
     or position('public.is_org_member' in v_member)=0 then
    raise exception 'Company helper is missing provenance, active-company, or organization checks';
  end if;

  select pg_get_functiondef('public.current_profile_id()'::regprocedure) into v_profile;
  select pg_get_functiondef('public.is_org_member(uuid)'::regprocedure) into v_org_member;
  select pg_get_functiondef('public.is_org_owner(uuid)'::regprocedure) into v_org_owner;

  if position('search_path TO ''''' in v_profile)=0
     or position('search_path TO ''''' in v_org_member)=0
     or position('search_path TO ''''' in v_org_owner)=0 then
    raise exception 'Profile and organization helper search_path must be empty';
  end if;

  if has_function_privilege('anon','private.is_company_member(uuid)'::regprocedure,'EXECUTE')
     or not has_function_privilege('authenticated','private.is_company_member(uuid)'::regprocedure,'EXECUTE') then
    raise exception 'Company helper execute grants are unsafe';
  end if;

  select pg_get_functiondef('public.create_company_for_current_user(uuid,text,text,text)'::regprocedure) into v_create;
  if position('membership_source' in v_create)=0
     or position('''owner''' in v_create)=0
     or position('is_org_owner' in v_create)=0 then
    raise exception 'Company creation does not create a provenance-backed owner';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='company_members'
      and cmd in ('INSERT','UPDATE','ALL')
      and (roles @> array['authenticated']::name[]
        or roles @> array['public']::name[]
        or roles @> array['anon']::name[])
  ) then
    raise exception 'Untrusted API roles can write company_members directly';
  end if;
end;
$$;
