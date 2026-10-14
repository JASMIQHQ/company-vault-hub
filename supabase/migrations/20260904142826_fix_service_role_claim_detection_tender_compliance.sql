CREATE OR REPLACE FUNCTION public.calculate_tender_compliance(p_tender_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  total_requirements numeric;
  matched_requirements numeric;
  compliance numeric;
  v_jwt_claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  v_internal_service_role boolean :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR coalesce(v_jwt_claims ->> 'role', '') = 'service_role';
begin
  if not v_internal_service_role
     and coalesce(current_setting('app.trusted_internal_call', true), 'false') <> 'true' then
    if not exists(
      select 1
      from public.tenders t
      where t.id = p_tender_id
        and public.is_org_member(t.organization_id)
    ) then
      raise exception 'forbidden';
    end if;
  end if;

  select count(*)
    into total_requirements
    from public.tender_requirements
   where tender_id = p_tender_id;

  if total_requirements = 0 then
    update public.tenders
       set compliance_percentage = 0
     where id = p_tender_id;
    return 0;
  end if;

  select count(*)
    into matched_requirements
    from public.tender_requirements
   where tender_id = p_tender_id
     and status = 'matched';

  compliance := round((matched_requirements / total_requirements) * 100, 2);

  update public.tenders
     set compliance_percentage = compliance
   where id = p_tender_id;

  return compliance;
end;
$function$;
