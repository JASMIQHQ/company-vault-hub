create table if not exists public.document_taxonomy (
  canonical_type text primary key,
  display_name text not null,
  tender_category text not null,
  issuing_authority text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.document_type_aliases (
  alias text primary key,
  canonical_type text not null references public.document_taxonomy(canonical_type) on update cascade on delete restrict,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists document_type_aliases_canonical_idx on public.document_type_aliases(canonical_type) where active;

alter table public.document_taxonomy enable row level security;
alter table public.document_type_aliases enable row level security;

grant select on public.document_taxonomy to authenticated;
grant select on public.document_type_aliases to authenticated;

drop policy if exists "authenticated_can_read_document_taxonomy" on public.document_taxonomy;
create policy "authenticated_can_read_document_taxonomy" on public.document_taxonomy for select to authenticated using (active = true);

drop policy if exists "authenticated_can_read_document_type_aliases" on public.document_type_aliases;
create policy "authenticated_can_read_document_type_aliases" on public.document_type_aliases for select to authenticated using (active = true);

insert into public.document_taxonomy (canonical_type, display_name, tender_category, issuing_authority, description) values
('TAX_CLEARANCE_CERTIFICATE','Tax Clearance Certificate','TAX','Federal Inland Revenue Service','Evidence of tax compliance/current tax clearance.'),
('PENCOM_CERTIFICATE','National Pension Commission Compliance Certificate','STATUTORY_COMPLIANCE','National Pension Commission','Evidence of pension compliance.'),
('ITF_CERTIFICATE','Industrial Training Fund Compliance Certificate','STATUTORY_COMPLIANCE','Industrial Training Fund','Evidence of ITF compliance.'),
('NSITF_CERTIFICATE','Nigeria Social Insurance Trust Fund Compliance Certificate','STATUTORY_COMPLIANCE','Nigeria Social Insurance Trust Fund','Evidence of Employees Compensation/NSITF compliance.'),
('BPP_CERTIFICATE','Bureau of Public Procurement Certificate of Registration','BPP_REGISTRATION','Bureau of Public Procurement','Evidence of BPP registration where required.'),
('CAC_CERTIFICATE','Corporate Affairs Certificate','CORPORATE','Corporate Affairs Commission','Corporate registration/incorporation evidence.'),
('OGISP_CERTIFICATE','OGISP Certificate','PROFESSIONAL_REGULATORY','Office of Government and Institutional Procurement','State/sector procurement registration where applicable.'),
('CPN_CERTIFICATE','Computer Professionals of Nigeria Certificate','PROFESSIONAL_REGULATORY','Computer Professionals of Nigeria','Professional/regulatory registration evidence.'),
('NEMSA_CERTIFICATE','Nigerian Electricity Management Services Agency Certificate','PROFESSIONAL_REGULATORY','Nigerian Electricity Management Services Agency','Electrical sector regulatory evidence where applicable.'),
('AUDITED_ACCOUNTS','Audited Accounts','FINANCIAL',null,'Audited financial statements for the required period.'),
('OTHER','Other Document','OTHER',null,'Document outside the controlled taxonomy.')
on conflict (canonical_type) do update set display_name=excluded.display_name,tender_category=excluded.tender_category,issuing_authority=excluded.issuing_authority,description=excluded.description,active=true;

insert into public.document_type_aliases (alias, canonical_type, display_name) values
('CAC','CAC_CERTIFICATE','Corporate Affairs Certificate'),
('CORPORATE AFFAIRS CERTIFICATE','CAC_CERTIFICATE','Corporate Affairs Certificate'),
('TCC','TAX_CLEARANCE_CERTIFICATE','Tax Clearance Certificate'),
('TAX CLEARANCE CERTIFICATE','TAX_CLEARANCE_CERTIFICATE','Tax Clearance Certificate'),
('PENCOM','PENCOM_CERTIFICATE','National Pension Commission Compliance Certificate'),
('NATIONAL PENSION COMMISSION COMPLIANCE CERTIFICATE','PENCOM_CERTIFICATE','National Pension Commission Compliance Certificate'),
('ITF','ITF_CERTIFICATE','Industrial Training Fund Compliance Certificate'),
('INDUSTRIAL TRAINING FUND COMPLIANCE CERTIFICATE','ITF_CERTIFICATE','Industrial Training Fund Compliance Certificate'),
('NSITF','NSITF_CERTIFICATE','Nigeria Social Insurance Trust Fund Compliance Certificate'),
('NIGERIA SOCIAL INSURANCE TRUST FUND COMPLIANCE CERTIFICATE','NSITF_CERTIFICATE','Nigeria Social Insurance Trust Fund Compliance Certificate'),
('BPP','BPP_CERTIFICATE','Bureau of Public Procurement Certificate of Registration'),
('BUREAU OF PUBLIC PROCUREMENT CERTIFICATE OF REGISTRATION','BPP_CERTIFICATE','Bureau of Public Procurement Certificate of Registration'),
('CPN','CPN_CERTIFICATE','Computer Professionals of Nigeria Certificate'),
('COMPUTER PROFESSIONALS OF NIGERIA','CPN_CERTIFICATE','Computer Professionals of Nigeria Certificate'),
('NEMSA','NEMSA_CERTIFICATE','Nigerian Electricity Management Services Agency Certificate'),
('NIGERIAN ELECTRICITY MANAGEMENT SERVICES AGENCY CERTIFICATE','NEMSA_CERTIFICATE','Nigerian Electricity Management Services Agency Certificate')
on conflict (alias) do update set canonical_type=excluded.canonical_type,display_name=excluded.display_name,active=true;
