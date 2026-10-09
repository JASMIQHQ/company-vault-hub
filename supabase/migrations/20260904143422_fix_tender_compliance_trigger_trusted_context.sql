CREATE OR REPLACE FUNCTION public.refresh_compliance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  PERFORM set_config('app.trusted_internal_call', 'true', true);

  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_tender_compliance(OLD.tender_id);
    RETURN OLD;
  END IF;

  PERFORM calculate_tender_compliance(NEW.tender_id);
  RETURN NEW;
END;
$$;
