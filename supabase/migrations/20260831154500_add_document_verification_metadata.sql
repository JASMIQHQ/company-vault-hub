alter table public.company_documents
  add column if not exists verified_doc_type text,
  add column if not exists verified_year integer,
  add column if not exists verified_expiry_date date,
  add column if not exists verification_status text not null default 'unverified';

-- verified_at already exists in the production schema, so it is intentionally reused.
alter table public.company_documents
  drop constraint if exists company_documents_verification_status_check;

alter table public.company_documents
  add constraint company_documents_verification_status_check
  check (verification_status in ('unverified','verified','mismatch','failed'));

-- Match basis is persisted on the existing requirement ledger; no matching table is introduced.
alter table public.tender_requirements
  add column if not exists match_basis text;

alter table public.tender_requirements
  drop constraint if exists tender_requirements_match_basis_check;

alter table public.tender_requirements
  add constraint tender_requirements_match_basis_check
  check (match_basis is null or match_basis in ('METADATA','HYBRID','CONTENT','CONFLICT'));

create index if not exists idx_company_documents_verification_lookup
  on public.company_documents (organization_id, company_id, verified_doc_type, verified_year)
  where deleted_at is null;
