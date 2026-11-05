-- Preserve the original applied company-authorization migration.
-- This follow-up records how each company membership is authorized.
--
-- The historical migration backfilled every organization member into every
-- active company. Those rows cannot safely be deleted: the database did not
-- record whether a non-owner row was implicit or explicitly granted.
-- Instead, retain them as legacy_backfill (denied by the authorization helper)
-- and require trusted server-side code to mark future explicit assignments.
--
-- No membership rows are deleted by this migration.

alter table public.company_members
  add column if not exists membership_source text not null default 'legacy_backfill';

alter table public.company_members
  drop constraint if exists company_members_membership_source_check;

alter table public.company_members
  add constraint company_members_membership_source_check
  check (membership_source in ('legacy_backfill', 'owner', 'explicit'));

-- The only existing memberships that can be positively identified as owner
-- memberships are those backed by an owner row in organization_members.
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

-- Default-deny legacy backfill rows. Explicit assignments are accepted only
-- when a trusted server-side path writes membership_source = explicit.
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
    join public.companies c
      on c.id = cm.company_id
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

revoke all on function private.is_company_member(uuid) from public, anon;
grant execute on function private.is_company_member(uuid) to authenticated;

-- Keep company creation consistent with the new provenance contract.
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
    membership_source = 'owner';

  return v_company;
end;
$$;

-- Fail the migration if owner rows were not classified correctly.
do $$
begin
  if exists (
    select 1
    from public.company_members cm
    join public.organization_members om
      on om.organization_id = cm.organization_id
     and om.profile_id = cm.profile_id
    where om.is_owner is true
      and cm.membership_source <> 'owner'
  ) then
    raise exception 'Company membership provenance check failed: owner membership was not classified';
  end if;
end;
$$;
