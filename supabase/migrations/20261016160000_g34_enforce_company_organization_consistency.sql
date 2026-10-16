-- G34: derive the document organization from the persisted company.
-- Review and validate on a disposable/staging database before release.
CREATE OR REPLACE FUNCTION public.register_document_upload(
 p_company_id uuid, p_category text, p_document_type text, p_document_name text,
 p_original_filename text, p_storage_path text, p_mime_type text,
 p_file_size bigint, p_sha256_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_document_id uuid; v_organization_id uuid;
BEGIN
 SELECT c.organization_id INTO v_organization_id
 FROM public.companies c
 WHERE c.id = p_company_id AND c.is_active = true;

 IF v_organization_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
   RAISE EXCEPTION 'forbidden' USING errcode = '42501';
 END IF;

 INSERT INTO public.company_documents(
  organization_id, company_id, uploaded_by, category, document_type,
  document_name, original_filename, storage_path, mime_type, file_size,
  sha256_hash, analysis_status, document_status, version
 ) VALUES (
  v_organization_id, p_company_id, public.current_profile_id(), p_category,
  p_document_type, p_document_name, p_original_filename, p_storage_path,
  p_mime_type, p_file_size, p_sha256_hash, 'pending', 'active', 1
 ) RETURNING id INTO v_document_id;
 RETURN v_document_id;
END;
$$;

-- Reject inconsistent persisted tender/company ownership before any write.
CREATE OR REPLACE FUNCTION public.calculate_tender_compliance(p_tender_id uuid)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 total_requirements numeric; matched_requirements numeric; compliance numeric;
 v_company_id uuid; v_tender_org_id uuid; v_company_org_id uuid;
BEGIN
 SELECT t.company_id, t.organization_id INTO v_company_id, v_tender_org_id
 FROM public.tenders t WHERE t.id = p_tender_id;

 SELECT c.organization_id INTO v_company_org_id
 FROM public.companies c WHERE c.id = v_company_id AND c.is_active = true;

 IF v_company_id IS NULL OR v_company_org_id IS NULL
    OR v_tender_org_id IS DISTINCT FROM v_company_org_id
    OR NOT private.is_company_member(v_company_id) THEN
   RAISE EXCEPTION 'forbidden' USING errcode = '42501';
 END IF;

 SELECT count(*) INTO total_requirements
 FROM public.tender_requirements WHERE tender_id = p_tender_id;

 IF total_requirements = 0 THEN
   UPDATE public.tenders SET compliance_percentage = 0
   WHERE id = p_tender_id AND company_id = v_company_id
     AND organization_id = v_company_org_id;
   RETURN 0;
 END IF;

 SELECT count(*) INTO matched_requirements
 FROM public.tender_requirements
 WHERE tender_id = p_tender_id AND status = 'matched';

 compliance := round((matched_requirements / total_requirements) * 100, 2);
 UPDATE public.tenders SET compliance_percentage = compliance
 WHERE id = p_tender_id AND company_id = v_company_id
   AND organization_id = v_company_org_id;
 RETURN compliance;
END;
$$;
