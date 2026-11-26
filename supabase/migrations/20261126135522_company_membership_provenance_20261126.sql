-- JASMIQ G40: company-membership provenance and active-company authorization.
-- Additive migration: preserves all historical rows and defaults ambiguous rows
-- to legacy_backfill (retained for audit, denied by authorization helpers).

begin;

alter table public.company_members
  add column if not exists membership_source text not null default 'legacy_backfill';

alter table public.company_members
  drop constraint if exists company_members_membership_source_check;

alter table public.company_members
  add constraint company_members_membership_source_check
  check (membership_source in ('legacy_backfill', 'owner', 'explicit'));

update public.company_members cm
set membership_source = 'owner'
where exists (
  select 1
  from public.organization_members om
  where om.organization_id = cm.organization_id
    and om.profile_id = cm.profile_id
    and om.is_owner is true
);

comment on column public.company_members.membership_source is
  'Authorization provenance: owner, explicit (trusted server-side assignment), or legacy_backfill (retained for audit but not authorized).';

-- Harden the profile/org helpers used by RLS and SECURITY DEFINER functions.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org
      and om.profile_id = public.current_profile_id()
  );
$$;

create or replace function public.is_org_owner(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org
      and om.profile_id = public.current_profile_id()
      and om.is_owner is true
  );
$$;

create or replace function private.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.company_id = p_company_id
      and cm.profile_id = public.current_profile_id()
      and cm.organization_id = c.organization_id
      and c.is_active is true
      and public.is_org_member(cm.organization_id)
      and (
        cm.membership_source = 'explicit'
        or (
          cm.membership_source = 'owner'
          and exists (
            select 1
            from public.organization_members om
            where om.organization_id = cm.organization_id
              and om.profile_id = cm.profile_id
              and om.is_owner is true
          )
        )
      )
  );
$$;

create or replace function public.create_company_for_current_user(
  p_organization_id uuid,
  p_legal_name text,
  p_registration_number text default null,
  p_tax_identification_number text default null
)
returns public.companies
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company public.companies;
begin
  if not public.is_org_owner(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if nullif(trim(p_legal_name), '') is null then
    raise exception 'company legal name is required' using errcode = '22023';
  end if;

  insert into public.companies (
    organization_id,
    legal_name,
    registration_number,
    tax_identification_number
  )
  values (
    p_organization_id,
    trim(p_legal_name),
    nullif(trim(p_registration_number), ''),
    nullif(trim(p_tax_identification_number), '')
  )
  returning * into v_company;

  insert into public.company_members (
    company_id,
    profile_id,
    organization_id,
    role,
    membership_source
  )
  values (
    v_company.id,
    public.current_profile_id(),
    v_company.organization_id,
    'owner',
    'owner'
  )
  on conflict (company_id, profile_id)
  do update set
    role = 'owner',
    organization_id = excluded.organization_id,
    membership_source = 'owner';

  return v_company;
end;
$$;

revoke all on function public.current_profile_id() from public, anon;
grant execute on function public.current_profile_id() to authenticated, service_role;

revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

revoke all on function public.is_org_owner(uuid) from public, anon;
grant execute on function public.is_org_owner(uuid) to authenticated, service_role;

revoke all on function private.is_company_member(uuid) from public, anon;
grant execute on function private.is_company_member(uuid) to authenticated;

revoke all on function public.create_company_for_current_user(uuid, text, text, text) from public, anon;
grant execute on function public.create_company_for_current_user(uuid, text, text, text) to authenticated;

commit;
