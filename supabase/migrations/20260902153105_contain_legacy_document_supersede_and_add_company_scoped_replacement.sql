revoke execute on function public.supersede_existing_document(text) from authenticated;

create or replace function public.supersede_existing_document(p_company_id uuid, p_document_type text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_organization_id uuid;
  v_count integer;
begin
  v_organization_id := public.current_organization_id();

  if v_organization_id is null then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.organization_id = v_organization_id
      and c.is_active = true
  ) then
    raise exception 'forbidden';
  end if;

  update public.company_documents
  set document_status = 'superseded',
      updated_at = now()
  where company_id = p_company_id
    and organization_id = v_organization_id
    and upper(document_type) = upper(trim(p_document_type))
    and document_status = 'active';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.supersede_existing_document(uuid, text) from public;
grant execute on function public.supersede_existing_document(uuid, text) to authenticated;
grant execute on function public.supersede_existing_document(uuid, text) to service_role;
