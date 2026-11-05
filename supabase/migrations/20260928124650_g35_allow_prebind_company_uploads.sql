
drop policy if exists company_documents_storage_insert on storage.objects;
create policy company_documents_storage_insert on storage.objects
for insert to authenticated
with check (
 bucket_id='company-documents'
 and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
 and (select public.is_org_member(((storage.foldername(name))[1])::uuid))
);

