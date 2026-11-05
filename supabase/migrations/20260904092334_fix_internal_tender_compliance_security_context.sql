BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_tender_compliance(p_tender_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare total_requirements numeric; matched_requirements numeric; compliance numeric;
begin
  if coalesce(current_setting('app.trusted_internal_call', true), 'false') <> 'true' then
    if not exists(select 1 from tenders t where t.id=p_tender_id and is_org_member(t.organization_id)) then raise exception 'forbidden'; end if;
  end if;
  select count(*) into total_requirements from tender_requirements where tender_id=p_tender_id;
  if total_requirements=0 then update tenders set compliance_percentage=0 where id=p_tender_id; return 0; end if;
  select count(*) into matched_requirements from tender_requirements where tender_id=p_tender_id and status='matched';
  compliance:=round((matched_requirements/total_requirements)*100,2);
  update tenders set compliance_percentage=compliance where id=p_tender_id;
  return compliance;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_tender_analyzed(p_tender_id uuid, p_procuring_entity text, p_submission_deadline timestamp with time zone, p_analysis_json jsonb, p_requirements jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_org uuid;
    v_req jsonb;
    v_position integer := 0;
BEGIN
    PERFORM set_config('app.trusted_internal_call', 'true', true);

    SELECT organization_id
    INTO v_org
    FROM public.tenders
    WHERE id = p_tender_id;

    IF v_org IS NULL THEN
        RAISE EXCEPTION 'Tender not found';
    END IF;

    UPDATE public.tenders
    SET
        analysis_status = 'analyzed',
        procuring_entity = p_procuring_entity,
        submission_deadline = p_submission_deadline,
        analysis_json = COALESCE(p_analysis_json, '{}'::jsonb),
        analyzed_at = NOW(),
        analysis_error = NULL,
        updated_at = NOW()
    WHERE id = p_tender_id;

    DELETE FROM public.tender_requirements
    WHERE tender_id = p_tender_id;

    FOR v_req IN
        SELECT value
        FROM jsonb_array_elements(
            COALESCE(p_requirements, '[]'::jsonb)
        )
    LOOP

        v_position := v_position + 1;

        INSERT INTO public.tender_requirements (
            tender_id,
            organization_id,
            category,
            requirement_name,
            requirement_text,
            source,
            status,
            display_order
        )
        VALUES (
            p_tender_id,
            v_org,

            COALESCE(
                NULLIF(v_req->>'category', ''),
                'general'
            ),

            COALESCE(
                NULLIF(v_req->>'requirement_name', ''),
                NULLIF(v_req->>'title', ''),
                'Untitled Requirement'
            ),

            COALESCE(
                NULLIF(v_req->>'requirement_text', ''),
                NULLIF(v_req->>'description', ''),
                ''
            ),

            'ai_extracted',

            'pending',

            COALESCE(
                NULLIF(v_req->>'display_order', '')::integer,
                v_position
            )
        );

    END LOOP;

END;
$function$;

COMMIT;
