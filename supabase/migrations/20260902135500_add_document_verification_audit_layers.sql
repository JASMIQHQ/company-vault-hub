create table if not exists public.document_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.company_documents(id) on delete restrict,
  organization_id uuid not null,
  company_id uuid not null,
  requested_by uuid,
  provider text,
  model text,
  outcome text not null check (outcome in ('verified','mismatch','failed')),
  detected_doc_type text,
  detected_year integer,
  detected_expiry_date date,
  confidence text check (confidence in ('high','low')),
  error_stage text,
  error_message text,
  diagnostics jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.document_verified_facts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.company_documents(id) on delete restrict,
  organization_id uuid not null,
  company_id uuid not null,
  doc_type text not null,
  doc_year integer,
  expiry_date date,
  confidence text not null check (confidence in ('high','low')),
  verification_attempt_id uuid references public.document_verification_attempts(id) on delete restrict,
  verified_at timestamptz not null default now()
);

create index if not exists idx_document_verification_attempts_document_created on public.document_verification_attempts(document_id, created_at desc);
create index if not exists idx_document_verified_facts_document_verified_at on public.document_verified_facts(document_id, verified_at desc);
create index if not exists idx_document_verified_facts_company_type_year on public.document_verified_facts(organization_id, company_id, doc_type, doc_year);

alter table public.document_verification_attempts enable row level security;
alter table public.document_verified_facts enable row level security;

drop policy if exists document_verification_attempts_select_member on public.document_verification_attempts;
create policy document_verification_attempts_select_member on public.document_verification_attempts for select to authenticated using (exists (select 1 from public.organization_members om where om.organization_id = document_verification_attempts.organization_id and om.profile_id = (select p.id from public.profiles p where p.auth_user_id = auth.uid())));

drop policy if exists document_verified_facts_select_member on public.document_verified_facts;
create policy document_verified_facts_select_member on public.document_verified_facts for select to authenticated using (exists (select 1 from public.organization_members om where om.organization_id = document_verified_facts.organization_id and om.profile_id = (select p.id from public.profiles p where p.auth_user_id = auth.uid())));

create or replace function public.prevent_verification_audit_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Verification audit records are append-only';
end;
$$;

drop trigger if exists prevent_document_verification_attempts_update on public.document_verification_attempts;
create trigger prevent_document_verification_attempts_update before update or delete on public.document_verification_attempts for each row execute function public.prevent_verification_audit_mutation();
drop trigger if exists prevent_document_verified_facts_update on public.document_verified_facts;
create trigger prevent_document_verified_facts_update before update or delete on public.document_verified_facts for each row execute function public.prevent_verification_audit_mutation();
