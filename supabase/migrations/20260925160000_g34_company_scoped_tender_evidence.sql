-- G34: tighten company-scoped access for tender evidence surfaces.
-- No tables/columns/data changes.

drop policy if exists compliance_matches_company_access on public.compliance_matches;
create policy compliance_matches_company_access
on public.compliance_matches
for all to authenticated
using (
  is_org_member(organization_id)
  and exists (
    select 1 from public.tenders t
    join public.company_documents cd
      on cd.id = compliance_matches.document_id
     and cd.organization_id = compliance_matches.organization_id
    where t.id = compliance_matches.tender_id
      and t.organization_id = compliance_matches.organization_id
      and t.company_id = cd.company_id
  )
)
with check (
  is_org_member(organization_id)
  and exists (
    select 1 from public.tenders t
    join public.company_documents cd
      on cd.id = compliance_matches.document_id
     and cd.organization_id = compliance_matches.organization_id
    where t.id = compliance_matches.tender_id
      and t.organization_id = compliance_matches.organization_id
      and t.company_id = cd.company_id
  )
);

drop policy if exists org_access_compliance_matches on public.compliance_matches;

drop policy if exists tender_files_org_access on public.tender_files;
create policy tender_files_org_company_access
on public.tender_files for all to authenticated
using (
  is_org_member(organization_id)
  and exists (select 1 from public.tenders t where t.id=tender_files.tender_id and t.organization_id=tender_files.organization_id and t.company_id is not null)
)
with check (
  is_org_member(organization_id)
  and exists (select 1 from public.tenders t where t.id=tender_files.tender_id and t.organization_id=tender_files.organization_id and t.company_id is not null)
);

drop policy if exists tender_requirements_org_access on public.tender_requirements;
create policy tender_requirements_org_company_access
on public.tender_requirements for all to authenticated
using (
  is_org_member(organization_id)
  and exists (select 1 from public.tenders t where t.id=tender_requirements.tender_id and t.organization_id=tender_requirements.organization_id and t.company_id is not null)
)
with check (
  is_org_member(organization_id)
  and exists (select 1 from public.tenders t where t.id=tender_requirements.tender_id and t.organization_id=tender_requirements.organization_id and t.company_id is not null)
);

drop policy if exists generated_documents_org_access on public.generated_documents;
create policy generated_documents_org_company_access
on public.generated_documents for all to authenticated
using (
  is_org_member(organization_id)
  and (tender_id is null or exists (select 1 from public.tenders t where t.id=generated_documents.tender_id and t.organization_id=generated_documents.organization_id and t.company_id is not null))
)
with check (
  is_org_member(organization_id)
  and (tender_id is null or exists (select 1 from public.tenders t where t.id=generated_documents.tender_id and t.organization_id=generated_documents.organization_id and t.company_id is not null))
);
