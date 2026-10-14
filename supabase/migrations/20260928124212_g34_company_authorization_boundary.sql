
create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, profile_id)
);
create index if not exists company_members_profile_id_idx on public.company_members(profile_id);
create index if not exists company_members_organization_id_idx on public.company_members(organization_id);
alter table public.company_members enable row level security;

insert into public.company_members(company_id,profile_id,organization_id)
select c.id,om.profile_id,c.organization_id
from public.companies c
join public.organization_members om on om.organization_id=c.organization_id
where c.is_active=true
on conflict do nothing;

create schema if not exists private;
create or replace function private.is_company_member(p_company_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
select exists(
 select 1 from public.company_members cm
 join public.companies c on c.id=cm.company_id
 where cm.company_id=p_company_id
 and cm.profile_id=public.current_profile_id()
 and cm.organization_id=c.organization_id
 and c.is_active=true
 and public.is_org_member(cm.organization_id)
);
$$;
revoke all on function private.is_company_member(uuid) from public,anon;
grant execute on function private.is_company_member(uuid) to authenticated;

drop policy if exists company_members_self_read on public.company_members;
create policy company_members_self_read on public.company_members
for select to authenticated using(profile_id=public.current_profile_id());

drop policy if exists company_documents_org_company_access on public.company_documents;
create policy company_documents_company_access on public.company_documents
for all to authenticated
using((select private.is_company_member(company_id)))
with check((select private.is_company_member(company_id)));

drop policy if exists tenders_org_company_access on public.tenders;
create policy tenders_company_access on public.tenders
for all to authenticated
using((select private.is_company_member(company_id)))
with check((select private.is_company_member(company_id)));

drop policy if exists tender_requirements_org_company_access on public.tender_requirements;
create policy tender_requirements_company_access on public.tender_requirements
for all to authenticated
using(exists(select 1 from public.tenders t where t.id=tender_requirements.tender_id and t.organization_id=tender_requirements.organization_id and (select private.is_company_member(t.company_id))))
with check(exists(select 1 from public.tenders t where t.id=tender_requirements.tender_id and t.organization_id=tender_requirements.organization_id and (select private.is_company_member(t.company_id))));

drop policy if exists tender_files_org_company_access on public.tender_files;
create policy tender_files_company_access on public.tender_files
for all to authenticated
using(exists(select 1 from public.tenders t where t.id=tender_files.tender_id and t.organization_id=tender_files.organization_id and (select private.is_company_member(t.company_id))))
with check(exists(select 1 from public.tenders t where t.id=tender_files.tender_id and t.organization_id=tender_files.organization_id and (select private.is_company_member(t.company_id))));

drop policy if exists compliance_matches_company_access on public.compliance_matches;
create policy compliance_matches_company_access on public.compliance_matches
for all to authenticated
using(exists(select 1 from public.tenders t join public.company_documents cd on cd.id=compliance_matches.document_id and cd.organization_id=compliance_matches.organization_id where t.id=compliance_matches.tender_id and t.organization_id=compliance_matches.organization_id and t.company_id=cd.company_id and (select private.is_company_member(t.company_id))))
with check(exists(select 1 from public.tenders t join public.company_documents cd on cd.id=compliance_matches.document_id and cd.organization_id=compliance_matches.organization_id where t.id=compliance_matches.tender_id and t.organization_id=compliance_matches.organization_id and t.company_id=cd.company_id and (select private.is_company_member(t.company_id))));

drop policy if exists generated_documents_org_company_access on public.generated_documents;
create policy generated_documents_company_access on public.generated_documents
for all to authenticated
using((tender_id is null and is_org_member(organization_id)) or exists(select 1 from public.tenders t where t.id=generated_documents.tender_id and t.organization_id=generated_documents.organization_id and (select private.is_company_member(t.company_id))))
with check((tender_id is null and is_org_member(organization_id)) or exists(select 1 from public.tenders t where t.id=generated_documents.tender_id and t.organization_id=generated_documents.organization_id and (select private.is_company_member(t.company_id))));

drop policy if exists document_verification_attempts_select_member on public.document_verification_attempts;
create policy document_verification_attempts_select_company on public.document_verification_attempts
for select to authenticated
using(exists(select 1 from public.company_documents cd where cd.id=document_verification_attempts.document_id and cd.organization_id=document_verification_attempts.organization_id and (select private.is_company_member(cd.company_id))));

drop policy if exists document_verified_facts_select_member on public.document_verified_facts;
create policy document_verified_facts_select_company on public.document_verified_facts
for select to authenticated
using(exists(select 1 from public.company_documents cd where cd.id=document_verified_facts.document_id and cd.organization_id=document_verified_facts.organization_id and (select private.is_company_member(cd.company_id))));

drop policy if exists bank_reference_requests_org_access on public.bank_reference_requests;
create policy bank_reference_requests_company_access on public.bank_reference_requests
for all to authenticated
using((select private.is_company_member(company_id)))
with check((select private.is_company_member(company_id)));

drop policy if exists affidavit_requests_org_access on public.affidavit_requests;
create policy affidavit_requests_company_access on public.affidavit_requests
for all to authenticated
using(exists(select 1 from public.tenders t where t.id=affidavit_requests.tender_id and t.organization_id=affidavit_requests.organization_id and (select private.is_company_member(t.company_id))))
with check(exists(select 1 from public.tenders t where t.id=affidavit_requests.tender_id and t.organization_id=affidavit_requests.organization_id and (select private.is_company_member(t.company_id))));

