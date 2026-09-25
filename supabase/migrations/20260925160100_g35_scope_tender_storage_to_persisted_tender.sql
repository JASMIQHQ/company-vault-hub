-- G35: bind tender-file objects to the persisted tender/company context.
-- Company-document object paths remain org-prefixed today; this does not claim per-company storage isolation for that bucket.

drop policy if exists tender_files_select_org on storage.objects;
drop policy if exists tender_files_insert_org on storage.objects;
drop policy if exists tender_files_update_org on storage.objects;
drop policy if exists tender_files_delete_org on storage.objects;

create policy tender_files_storage_select_scoped on storage.objects for select to authenticated
using (
  bucket_id='tender-files' and exists (
    select 1 from public.tender_files tf join public.tenders t on t.id=tf.tender_id
    where tf.organization_id=((storage.foldername(name))[1])::uuid and tf.storage_path=name
      and t.organization_id=tf.organization_id and t.company_id is not null and is_org_member(tf.organization_id)
  )
);

create policy tender_files_storage_insert_scoped on storage.objects for insert to authenticated
with check (
  bucket_id='tender-files' and exists (
    select 1 from public.tender_files tf join public.tenders t on t.id=tf.tender_id
    where tf.organization_id=((storage.foldername(name))[1])::uuid and tf.storage_path=name
      and t.organization_id=tf.organization_id and t.company_id is not null and is_org_member(tf.organization_id)
  )
);

create policy tender_files_storage_update_scoped on storage.objects for update to authenticated
using (
  bucket_id='tender-files' and exists (
    select 1 from public.tender_files tf join public.tenders t on t.id=tf.tender_id
    where tf.organization_id=((storage.foldername(name))[1])::uuid and tf.storage_path=name
      and t.organization_id=tf.organization_id and t.company_id is not null and is_org_member(tf.organization_id)
  )
)
with check (
  bucket_id='tender-files' and exists (
    select 1 from public.tender_files tf join public.tenders t on t.id=tf.tender_id
    where tf.organization_id=((storage.foldername(name))[1])::uuid and tf.storage_path=name
      and t.organization_id=tf.organization_id and t.company_id is not null and is_org_member(tf.organization_id)
  )
);

create policy tender_files_storage_delete_scoped on storage.objects for delete to authenticated
using (
  bucket_id='tender-files' and exists (
    select 1 from public.tender_files tf join public.tenders t on t.id=tf.tender_id
    where tf.organization_id=((storage.foldername(name))[1])::uuid and tf.storage_path=name
      and t.organization_id=tf.organization_id and t.company_id is not null and is_org_member(tf.organization_id)
  )
);
