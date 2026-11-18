-- Staging recovery helper: install the FINAL G35 Storage policy state.
-- Run only after the schema baseline and required helper functions are restored.
-- This script is intentionally guarded and idempotent. It is NOT a migration
-- and must not be run against production as part of this recovery work.

begin;

do $preflight$
begin
  if to_regclass('storage.objects') is null then
    raise exception 'Storage policy bootstrap blocked: storage.objects is unavailable';
  end if;
  if to_regclass('public.company_documents') is null
     or to_regclass('public.tender_files') is null
     or to_regclass('public.tenders') is null then
    raise exception 'Storage policy bootstrap blocked: required application tables are unavailable';
  end if;
  if to_regprocedure('public.is_org_member(uuid)') is null then
    raise exception 'Storage policy bootstrap blocked: public.is_org_member(uuid) is missing; restore its reviewed definition before retrying';
  end if;
  if to_regprocedure('private.is_company_member(uuid)') is null then
    raise exception 'Storage policy bootstrap blocked: private.is_company_member(uuid) is missing; restore its reviewed definition before retrying';
  end if;
end
$preflight$;

-- Company documents: SELECT/UPDATE/DELETE require an existing document row
-- and active company membership. INSERT intentionally supports pre-binding
-- uploads into an organization UUID folder, as in the later G35 migration.
drop policy if exists company_documents_storage_select on storage.objects;
drop policy if exists company_documents_storage_insert on storage.objects;
drop policy if exists company_documents_storage_update on storage.objects;
drop policy if exists company_documents_storage_delete on storage.objects;

create policy company_documents_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1 from public.company_documents cd
    where cd.storage_path = storage.objects.name
      and (select private.is_company_member(cd.company_id))
  )
);

create policy company_documents_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'company-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and (select public.is_org_member(((storage.foldername(name))[1])::uuid))
);

create policy company_documents_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1 from public.company_documents cd
    where cd.storage_path = storage.objects.name
      and (select private.is_company_member(cd.company_id))
  )
)
with check (
  bucket_id = 'company-documents'
  and exists (
    select 1 from public.company_documents cd
    where cd.storage_path = storage.objects.name
      and (select private.is_company_member(cd.company_id))
  )
);

create policy company_documents_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1 from public.company_documents cd
    where cd.storage_path = storage.objects.name
      and (select private.is_company_member(cd.company_id))
  )
);

-- Tender files: all operations are scoped through the tender's company and
-- require the file row's organization to agree with the parent tender.
drop policy if exists tender_files_storage_select_scoped on storage.objects;
drop policy if exists tender_files_storage_insert_scoped on storage.objects;
drop policy if exists tender_files_storage_update_scoped on storage.objects;
drop policy if exists tender_files_storage_delete_scoped on storage.objects;

create policy tender_files_storage_select_scoped on storage.objects
for select to authenticated
using (
  bucket_id = 'tender-files'
  and exists (
    select 1
    from public.tender_files tf
    join public.tenders t on t.id = tf.tender_id
    where tf.storage_path = storage.objects.name
      and tf.organization_id = t.organization_id
      and (select private.is_company_member(t.company_id))
  )
);

create policy tender_files_storage_insert_scoped on storage.objects
for insert to authenticated
with check (
  bucket_id = 'tender-files'
  and exists (
    select 1
    from public.tender_files tf
    join public.tenders t on t.id = tf.tender_id
    where tf.storage_path = storage.objects.name
      and tf.organization_id = t.organization_id
      and (select private.is_company_member(t.company_id))
  )
);

create policy tender_files_storage_update_scoped on storage.objects
for update to authenticated
using (
  bucket_id = 'tender-files'
  and exists (
    select 1
    from public.tender_files tf
    join public.tenders t on t.id = tf.tender_id
    where tf.storage_path = storage.objects.name
      and tf.organization_id = t.organization_id
      and (select private.is_company_member(t.company_id))
  )
)
with check (
  bucket_id = 'tender-files'
  and exists (
    select 1
    from public.tender_files tf
    join public.tenders t on t.id = tf.tender_id
    where tf.storage_path = storage.objects.name
      and tf.organization_id = t.organization_id
      and (select private.is_company_member(t.company_id))
  )
);

create policy tender_files_storage_delete_scoped on storage.objects
for delete to authenticated
using (
  bucket_id = 'tender-files'
  and exists (
    select 1
    from public.tender_files tf
    join public.tenders t on t.id = tf.tender_id
    where tf.storage_path = storage.objects.name
      and tf.organization_id = t.organization_id
      and (select private.is_company_member(t.company_id))
  )
);

commit;
