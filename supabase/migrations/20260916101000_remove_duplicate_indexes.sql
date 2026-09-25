-- Remove only indexes confirmed by the Supabase advisor to be exact duplicates.
-- The surviving indexes retain the more descriptive/current names.

drop index if exists public.idx_bank_reference_org;
drop index if exists public.idx_bank_reference_tender;
drop index if exists public.idx_company_documents_hash_lookup;
drop index if exists public.idx_tenders_analysis_status;
drop index if exists public.idx_tenders_analysis_json;
