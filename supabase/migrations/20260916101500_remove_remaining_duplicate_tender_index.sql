-- Keep the more descriptive tender analysis-status index; remove its exact duplicate.
drop index if exists public.idx_tenders_status;
