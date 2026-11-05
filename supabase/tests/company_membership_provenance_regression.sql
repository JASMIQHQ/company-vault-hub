-- Company membership authorization provenance structural regression checks.
-- Executed against the isolated local replay database by Quality Gate.
do $$
declare
  v_helper text;
  v_create text;
  v_column_default text;
  v_column_nullable text;
begin
  select column_default, is_nullable
    into v_column_default, v_column_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'company_members'
    and column_name = 'membership_source';

  if not found or v_column_nullable <> 'NO' or v_column_default is null then
    raise exception 'membership_source must be NOT NULL with a safe legacy_backfill default';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.company_members'::regclass
      and conname = 'company_members_membership_source_check'
      and pg_get_constraintdef(oid) like '%legacy_backfill%'
      and pg_get_constraintdef(oid) like '%owner%'
      and pg_get_constraintdef(oid) like '%explicit%'
  ) then
    raise exception 'membership_source constraint does not enforce the three allowed values';
  end if;

  select pg_get_functiondef('private.is_company_member(uuid)'::regprocedure)
    into v_helper;

  if position('membership_source' in v_helper) = 0
     or position('explicit' in v_helper) = 0
     or position('owner' in v_helper) = 0
     or position('is_owner' in v_helper) = 0 then
    raise exception 'Company authorization helper is missing provenance or current-owner checks';
  end if;

  if has_function_privilege('anon', 'private.is_company_member(uuid)'::regprocedure, 'EXECUTE')
     or has_function_privilege('public', 'private.is_company_member(uuid)'::regprocedure, 'EXECUTE')
     or not has_function_privilege('authenticated', 'private.is_company_member(uuid)'::regprocedure, 'EXECUTE') then
    raise exception 'Company authorization helper has an unsafe execute grant';
  end if;

  select pg_get_functiondef('public.create_company_for_current_user(uuid,text,text,text)'::regprocedure)
    into v_create;

  if position('membership_source' in v_create) = 0
     or position('''owner''' in v_create) = 0
     or position('is_org_owner' in v_create) = 0 then
    raise exception 'Company creation does not create a provenance-backed owner membership';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'company_members'
      and cmd in ('INSERT', 'UPDATE', 'ALL')
      and (
        roles @> array['authenticated']::name[]
        or roles @> array['public']::name[]
        or roles @> array['anon']::name[]
      )
  ) then
    raise exception 'Untrusted client roles can write company_members directly';
  end if;

  if exists (
    select 1
    from public.company_members
    where membership_source not in ('legacy_backfill', 'owner', 'explicit')
  ) then
    raise exception 'Unexpected company membership provenance value exists';
  end if;

  if exists (
    select 1
    from public.company_members cm
    join public.organization_members om
      on om.organization_id = cm.organization_id
     and om.profile_id = cm.profile_id
    where om.is_owner is true
      and cm.membership_source <> 'owner'
  ) then
    raise exception 'An organization owner membership was not classified as owner';
  end if;
end;
$$;
