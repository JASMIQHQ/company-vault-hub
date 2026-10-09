ALTER TABLE public.tender_requirements DROP CONSTRAINT tender_requirements_match_basis_check;
ALTER TABLE public.tender_requirements ADD CONSTRAINT tender_requirements_match_basis_check CHECK (
  match_basis IS NULL OR match_basis = ANY (ARRAY[
    'METADATA'::text,
    'HYBRID'::text,
    'CONTENT'::text,
    'CONFLICT'::text,
    'VERIFIED_FACT'::text,
    'VERIFIED_FACT+PDF_EVIDENCE'::text,
    'PROCEDURAL_DECLARATION'::text
  ])
);
