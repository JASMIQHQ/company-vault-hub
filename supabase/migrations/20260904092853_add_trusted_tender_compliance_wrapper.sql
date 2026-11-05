BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_tender_compliance_trusted(p_tender_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result numeric;
BEGIN
    PERFORM set_config('app.trusted_internal_call', 'true', true);
    v_result := public.calculate_tender_compliance(p_tender_id);
    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_tender_compliance_trusted(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_tender_compliance_trusted(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_tender_compliance_trusted(uuid) TO service_role;

COMMIT;
