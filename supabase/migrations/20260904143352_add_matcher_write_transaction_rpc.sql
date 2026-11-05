CREATE OR REPLACE FUNCTION public.matcher_write_requirement_and_match(
  p_organization_id uuid,
  p_tender_id uuid,
  p_requirement_id uuid,
  p_status text,
  p_matched_document_id uuid,
  p_confidence_score numeric,
  p_explanation text,
  p_match_basis text,
  p_requirement text,
  p_requirement_type text,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user <> 'jasmiq_app' AND session_user <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tender_requirements r
    WHERE r.id = p_requirement_id
      AND r.tender_id = p_tender_id
      AND r.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'requirement context mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tenders t
    WHERE t.id = p_tender_id
      AND t.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'tender context mismatch';
  END IF;

  PERFORM set_config('app.trusted_internal_call', 'true', true);

  UPDATE public.tender_requirements
  SET status = p_status::public.requirement_status,
      matched_document_id = p_matched_document_id,
      confidence_score = p_confidence_score,
      explanation = p_explanation,
      match_basis = p_match_basis
  WHERE id = p_requirement_id
    AND tender_id = p_tender_id
    AND organization_id = p_organization_id;

  INSERT INTO public.compliance_matches (
    organization_id,
    tender_id,
    document_id,
    requirement,
    requirement_type,
    status,
    confidence,
    notes
  )
  VALUES (
    p_organization_id,
    p_tender_id,
    p_matched_document_id,
    p_requirement,
    p_requirement_type,
    p_status,
    p_confidence_score,
    p_notes
  )
  ON CONFLICT (tender_id, document_id, requirement)
  DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    document_id = EXCLUDED.document_id,
    requirement_type = EXCLUDED.requirement_type,
    status = EXCLUDED.status,
    confidence = EXCLUDED.confidence,
    notes = EXCLUDED.notes;
END;
$$;

REVOKE ALL ON FUNCTION public.matcher_write_requirement_and_match(uuid, uuid, uuid, text, uuid, numeric, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.matcher_write_requirement_and_match(uuid, uuid, uuid, text, uuid, numeric, text, text, text, text, text) TO service_role;
