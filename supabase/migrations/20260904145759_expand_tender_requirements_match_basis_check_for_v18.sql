-- Migration: expand_tender_requirements_match_basis_check_for_v18
-- Reason: Matcher v18 intentionally uses VERIFIED_FACT / VERIFIED_FACT+PDF_EVIDENCE
-- to distinguish structured verified evidence from generic content matching.
-- Preserve all previously allowed values for backward compatibility.

ALTER TABLE public.tender_requirements
  DROP CONSTRAINT IF EXISTS tender_requirements_match_basis_check;

ALTER TABLE public.tender_requirements
  ADD CONSTRAINT tender_requirements_match_basis_check
  CHECK (
    match_basis IS NULL
    OR match_basis = ANY (ARRAY[
      'METADATA',
      'HYBRID',
      'CONTENT',
      'CONFLICT',
      'VERIFIED_FACT',
      'VERIFIED_FACT+PDF_EVIDENCE'
    ]::text[])
  );

COMMENT ON CONSTRAINT tender_requirements_match_basis_check
  ON public.tender_requirements
  IS 'Allows legacy values (METADATA, HYBRID, CONTENT, CONFLICT) plus matcher v18 canonical values (VERIFIED_FACT, VERIFIED_FACT+PDF_EVIDENCE).';
