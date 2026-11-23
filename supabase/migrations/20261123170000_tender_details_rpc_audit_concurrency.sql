-- Tender details editing: one authenticated owner RPC, optimistic concurrency, and an append-only audit event.
-- This migration is intentionally committed to the feature branch only. It is not applied to staging or production.

create or replace function public.audit_tender_details_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('app.tender_details_rpc', true) is distinct from 'true' then
    return new;
  end if;

  insert into public.audit_log (
    organization_id,
    profile_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    created_at
  )
  values (
    new.organization_id,
    public.current_profile_id(),
    'UPDATE',
    'tenders',
    new.id,
    jsonb_build_object(
      'title', old.title,
      'procuring_entity', old.procuring_entity,
      'reference_number', old.reference_number,
      'procurement_method', old.procurement_method,
      'tender_type', old.tender_type,
      'industry', old.industry,
      'submission_deadline', old.submission_deadline,
      'opening_date', old.opening_date,
      'requires_bid_security', old.requires_bid_security,
      'requires_bank_reference', old.requires_bank_reference,
      'requires_affidavit', old.requires_affidavit
    ),
    jsonb_build_object(
      'title', new.title,
      'procuring_entity', new.procuring_entity,
      'reference_number', new.reference_number,
      'procurement_method', new.procurement_method,
      'tender_type', new.tender_type,
      'industry', new.industry,
      'submission_deadline', new.submission_deadline,
      'opening_date', new.opening_date,
      'requires_bid_security', new.requires_bid_security,
      'requires_bank_reference', new.requires_bank_reference,
      'requires_affidavit', new.requires_affidavit
    ),
    now()
  );

  return new;
end;
$$;

drop trigger if exists audit_tender_details_update on public.tenders;
create trigger audit_tender_details_update
after update on public.tenders
for each row
when (
  old.title is distinct from new.title
  or old.procuring_entity is distinct from new.procuring_entity
  or old.reference_number is distinct from new.reference_number
  or old.procurement_method is distinct from new.procurement_method
  or old.tender_type is distinct from new.tender_type
  or old.industry is distinct from new.industry
  or old.submission_deadline is distinct from new.submission_deadline
  or old.opening_date is distinct from new.opening_date
  or old.requires_bid_security is distinct from new.requires_bid_security
  or old.requires_bank_reference is distinct from new.requires_bank_reference
  or old.requires_affidavit is distinct from new.requires_affidavit
)
execute function public.audit_tender_details_update();

revoke all on function public.audit_tender_details_update() from public, anon, authenticated;

create or replace function public.update_tender_details(
  p_tender_id uuid,
  p_organization_id uuid,
  p_expected_updated_at timestamptz,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tender public.tenders;
  v_opening_date timestamptz;
  v_submission_deadline timestamptz;
  v_allowed_keys text[] := array[
    'title',
    'procuring_entity',
    'reference_number',
    'procurement_method',
    'tender_type',
    'industry',
    'submission_deadline',
    'opening_date',
    'requires_bid_security',
    'requires_bank_reference',
    'requires_affidavit'
  ];
begin
  if auth.uid() is null or public.current_profile_id() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_tender_id is null or p_organization_id is null then
    raise exception 'tender and organization are required' using errcode = '22023';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'provide at least one tender detail to update' using errcode = '22023';
  end if;

  if (p_patch - v_allowed_keys) <> '{}'::jsonb then
    raise exception 'patch contains unsupported tender fields' using errcode = '22023';
  end if;

  select t.*
    into v_tender
  from public.tenders t
  where t.id = p_tender_id
    and t.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'tender not found' using errcode = 'P0002';
  end if;

  if not private.is_company_member(v_tender.company_id)
     or not public.is_org_owner(v_tender.organization_id) then
    raise exception 'forbidden: organization owner access required' using errcode = '42501';
  end if;

  if v_tender.updated_at is distinct from p_expected_updated_at then
    raise exception 'TENDER_EDIT_CONFLICT' using errcode = 'P0001';
  end if;

  if p_patch ? 'title'
     and (jsonb_typeof(p_patch->'title') <> 'string' or nullif(btrim(p_patch->>'title'), '') is null) then
    raise exception 'tender title is required' using errcode = '22023';
  end if;

  if p_patch ? 'procuring_entity' and jsonb_typeof(p_patch->'procuring_entity') not in ('string', 'null') then
    raise exception 'procuring_entity must be text or null' using errcode = '22023';
  end if;
  if p_patch ? 'reference_number' and jsonb_typeof(p_patch->'reference_number') not in ('string', 'null') then
    raise exception 'reference_number must be text or null' using errcode = '22023';
  end if;
  if p_patch ? 'procurement_method' and jsonb_typeof(p_patch->'procurement_method') not in ('string', 'null') then
    raise exception 'procurement_method must be text or null' using errcode = '22023';
  end if;
  if p_patch ? 'tender_type' and jsonb_typeof(p_patch->'tender_type') not in ('string', 'null') then
    raise exception 'tender_type must be text or null' using errcode = '22023';
  end if;
  if p_patch ? 'industry' and jsonb_typeof(p_patch->'industry') not in ('string', 'null') then
    raise exception 'industry must be text or null' using errcode = '22023';
  end if;
  if p_patch ? 'submission_deadline' and jsonb_typeof(p_patch->'submission_deadline') not in ('string', 'null') then
    raise exception 'submission_deadline must be an ISO date string or null' using errcode = '22023';
  end if;
  if p_patch ? 'opening_date' and jsonb_typeof(p_patch->'opening_date') not in ('string', 'null') then
    raise exception 'opening_date must be an ISO date string or null' using errcode = '22023';
  end if;
  if p_patch ? 'requires_bid_security' and jsonb_typeof(p_patch->'requires_bid_security') <> 'boolean' then
    raise exception 'requires_bid_security must be boolean' using errcode = '22023';
  end if;
  if p_patch ? 'requires_bank_reference' and jsonb_typeof(p_patch->'requires_bank_reference') <> 'boolean' then
    raise exception 'requires_bank_reference must be boolean' using errcode = '22023';
  end if;
  if p_patch ? 'requires_affidavit' and jsonb_typeof(p_patch->'requires_affidavit') <> 'boolean' then
    raise exception 'requires_affidavit must be boolean' using errcode = '22023';
  end if;

  v_submission_deadline := case
    when p_patch ? 'submission_deadline' then nullif(p_patch->>'submission_deadline', '')::timestamptz
    else v_tender.submission_deadline
  end;
  v_opening_date := case
    when p_patch ? 'opening_date' then nullif(p_patch->>'opening_date', '')::timestamptz
    else v_tender.opening_date
  end;

  if v_opening_date is not null
     and v_submission_deadline is not null
     and v_opening_date < v_submission_deadline then
    raise exception 'opening date cannot be earlier than the submission deadline' using errcode = '22023';
  end if;

  perform set_config('app.tender_details_rpc', 'true', true);

  update public.tenders t
  set
    title = case when p_patch ? 'title' then btrim(p_patch->>'title') else t.title end,
    procuring_entity = case when p_patch ? 'procuring_entity' then nullif(btrim(p_patch->>'procuring_entity'), '') else t.procuring_entity end,
    reference_number = case when p_patch ? 'reference_number' then nullif(btrim(p_patch->>'reference_number'), '') else t.reference_number end,
    procurement_method = case when p_patch ? 'procurement_method' then nullif(btrim(p_patch->>'procurement_method'), '') else t.procurement_method end,
    tender_type = case when p_patch ? 'tender_type' then nullif(btrim(p_patch->>'tender_type'), '') else t.tender_type end,
    industry = case when p_patch ? 'industry' then nullif(btrim(p_patch->>'industry'), '') else t.industry end,
    submission_deadline = case when p_patch ? 'submission_deadline' then v_submission_deadline else t.submission_deadline end,
    opening_date = case when p_patch ? 'opening_date' then v_opening_date else t.opening_date end,
    requires_bid_security = case when p_patch ? 'requires_bid_security' then (p_patch->>'requires_bid_security')::boolean else t.requires_bid_security end,
    requires_bank_reference = case when p_patch ? 'requires_bank_reference' then (p_patch->>'requires_bank_reference')::boolean else t.requires_bank_reference end,
    requires_affidavit = case when p_patch ? 'requires_affidavit' then (p_patch->>'requires_affidavit')::boolean else t.requires_affidavit end
  where t.id = p_tender_id
    and t.organization_id = p_organization_id
    and t.updated_at is not distinct from p_expected_updated_at
  returning t.* into v_tender;

  if not found then
    raise exception 'TENDER_EDIT_CONFLICT' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'id', v_tender.id,
    'organization_id', v_tender.organization_id,
    'title', v_tender.title,
    'procuring_entity', v_tender.procuring_entity,
    'reference_number', v_tender.reference_number,
    'procurement_method', v_tender.procurement_method,
    'tender_type', v_tender.tender_type,
    'industry', v_tender.industry,
    'submission_deadline', v_tender.submission_deadline,
    'opening_date', v_tender.opening_date,
    'requires_bid_security', v_tender.requires_bid_security,
    'requires_bank_reference', v_tender.requires_bank_reference,
    'requires_affidavit', v_tender.requires_affidavit,
    'updated_at', v_tender.updated_at
  );
end;
$$;

revoke all on function public.update_tender_details(uuid, uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.update_tender_details(uuid, uuid, timestamptz, jsonb) to authenticated;

-- Remove direct browser writes only for the metadata fields owned by this RPC.
-- Preserve existing grants for unrelated tender workflows (company assignment, status, analysis, etc.).
revoke update (
  title,
  procuring_entity,
  reference_number,
  procurement_method,
  tender_type,
  industry,
  submission_deadline,
  opening_date,
  requires_bid_security,
  requires_bank_reference,
  requires_affidavit
) on public.tenders from authenticated;
