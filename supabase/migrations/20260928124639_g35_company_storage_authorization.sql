
drop policy if exists company_documents_storage_select on storage.objects;
drop policy if exists company_documents_storage_insert on storage.objects;
drop policy if exists company_documents_storage_update on storage.objects;
drop policy if exists company_documents_storage_delete on storage.objects;

create policy company_documents_storage_select on storage.objects
for select to authenticated
using (
 bucket_id='company-documents'
 and exists(
   select 1 from public.company_documents cd
   where cd.storage_path=storage.objects.name
     and (select private.is_company_member(cd.company_id))
 )
);

create policy company_documents_storage_insert on storage.objects
for insert to authenticated
with check (
 bucket_id='company-documents'
 and exists(
   select 1 from public.company_documents cd
   where cd.storage_path=storage.objects.name
     and (select private.is_company_member(cd.company_id))
 )
);

create policy company_documents_storage_update on storage.objects
for update to authenticated
using (
 bucket_id='company-documents'
 and exists(
   select 1 from public.company_documents cd
   where cd.storage_path=storage.objects.name
     and (select private.is_company_member(cd.company_id))
 )
)
with check (
 bucket_id='company-documents'
 and exists(
   select 1 from public.company_documents cd
   where cd.storage_path=storage.objects.name
     and (select private.is_company_member(cd.company_id))
 )
);

create policy company_documents_storage_delete on storage.objects
for delete to authenticated
using (
 bucket_id='company-documents'
 and exists(
   select 1 from public.company_documents cd
   where cd.storage_path=storage.objects.name
     and (select private.is_company_member(cd.company_id))
 )
);

drop policy if exists tender_files_storage_select_scoped on storage.objects;
drop policy if exists tender_files_storage_insert_scoped on storage.objects;
drop policy if exists tender_files_storage_update_scoped on storage.objects;
drop policy if exists tender_files_storage_delete_scoped on storage.objects;

create policy tender_files_storage_select_scoped on storage.objects
for select to authenticated
using (
 bucket_id='tender-files'
 and exists(
   select 1
   from public.tender_files tf join public.tenders t on t.id=tf.tender_id
   where tf.storage_path=storage.objects.name
     and tf.organization_id=t.organization_id
     and (select private.is_company_member(t.company_id))
 )
);

create policy tender_files_storage_insert_scoped on storage.objects
for insert to authenticated
with check (
 bucket_id='tender-files'
 and exists(
   select 1
   from public.tender_files tf join public.tenders t on t.id=tf.tender_id
   where tf.storage_path=storage.objects.name
     and tf.organization_id=t.organization_id
     and (select private.is_company_member(t.company_id))
 )
);

create policy tender_files_storage_update_scoped on storage.objects
for update to authenticated
using (
 bucket_id='tender-files'
 and exists(
   select 1 from public.tender_files tf join public.tenders t on t.id=tf.tender_id
   where tf.storage_path=storage.objects.name
     and tf.organization_id=t.organization_id
     and (select private.is_company_member(t.company_id))
 )
)
with check (
 bucket_id='tender-files'
 and exists(
   select 1 from public.tender_files tf join public.tenders t on t.id=tf.tender_id
   where tf.storage_path=storage.objects.name
     and tf.organization_id=t.organization_id
     and (select private.is_company_member(t.company_id))
 )
);

create policy tender_files_storage_delete_scoped on storage.objects
for delete to authenticated
using (
 bucket_id='tender-files'
 and exists(
   select 1 from public.tender_files tf join public.tenders t on t.id=tf.tender_id
   where tf.storage_path=storage.objects.name
     and tf.organization_id=t.organization_id
     and (select private.is_company_member(t.company_id))
 )
);

