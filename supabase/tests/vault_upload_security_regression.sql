-- G42 Vault upload and storage authorization regression checks.
-- Execute against isolated staging after the G42 migration.

do $$
declare
  v_register text;
  v_trusted_register text;
  v_legacy_wrapper text;
  v_scope_guard text;
  v_current_org text;
  v_policy text;
  v_insert_policy text;
  v_delete_policy text;
  v_count integer;
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'company-documents'
      and public is false
      and file_size_limit = 20971520
      and allowed_mime_types @> array['application/pdf', 'image/png', 'image/jpeg']::text[]
  ) then
    raise exception 'Private company-documents bucket is missing or incorrectly configured';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'tender-files'
      and public is false
      and file_size_limit = 20971520
      and allowed_mime_types @> array['application/pdf']::text[]
  ) then
    raise exception 'Private tender-files bucket is missing or incorrectly configured';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relname = 'objects' and c.relrowsecurity
  ) then
    raise exception 'Storage objects RLS must remain enabled';
  end if;

  select count(*)
  into v_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'company_documents_object_select',
      'company_documents_object_insert',
      'tender_files_object_select',
      'tender_files_object_insert',
      'tender_files_object_delete'
    );

  if v_count <> 5 then
    raise exception 'Expected five tenant-scoped Storage policies with browser document deletion disabled; found %', v_count;
  end if;

  select lower(coalesce(with_check, ''))
  into v_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'company_documents_object_insert';

  if v_policy is null
     or position('private.is_company_member' in v_policy) = 0
     or position('public.is_org_member' in v_policy) = 0
     or position('owner = auth.uid()' in v_policy) = 0 then
    raise exception 'Company document Storage INSERT must support company-scoped paths and owner-bound legacy paths';
  end if;

  select lower(coalesce(with_check, ''))
  into v_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'tender_files_object_insert';

  if v_policy is null
     or position('private.is_company_member' in v_policy) = 0
     or position('public.is_org_member' in v_policy) = 0 then
    raise exception 'Tender Storage INSERT must enforce company membership and legacy organization path ownership';
  end if;

  select lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  into v_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'company_documents'
    and policyname = 'company_documents_member_select';

  if v_policy is null
     or position('private.is_company_member' in v_policy) = 0
     or position('organization_id' in v_policy) = 0 then
    raise exception 'Company document SELECT RLS must enforce membership and organization/company consistency';
  end if;

  select lower(coalesce(with_check, ''))
  into v_insert_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'company_documents'
    and policyname = 'company_documents_member_insert';

  if v_insert_policy is null
     or position('uploaded_by' in v_insert_policy) = 0
     or position('current_profile_id' in v_insert_policy) = 0
     or position('verification_status = ''unverified''' in v_insert_policy) = 0
     or position('verified_doc_type is null' in v_insert_policy) = 0
     or position('analysis_status' in v_insert_policy) = 0
     or position('analysis_json = ''{}''::jsonb' in v_insert_policy) = 0
     or position('verified_at is null' in v_insert_policy) = 0
     or position('file_size between 1 and 20971520' in v_insert_policy) = 0
     or position('mime_type in' in v_insert_policy) = 0
     or position('sha256_hash' in v_insert_policy) = 0 then
    raise exception 'Company document INSERT RLS must bind uploader and prevent client-created verification facts';
  end if;

  select lower(coalesce(qual, ''))
  into v_delete_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'company_documents'
    and policyname = 'company_documents_member_delete';

  if v_delete_policy is null
     or position('deleted_at is not null' in v_delete_policy) = 0 then
    raise exception 'Only soft-deleted documents may be permanently deleted by authenticated users';
  end if;

  if has_table_privilege('authenticated', 'public.company_documents', 'INSERT')
     or has_table_privilege('authenticated', 'public.company_documents', 'DELETE') then
    raise exception 'Browser roles must not insert evidence metadata or bypass the audited permanent-delete flow';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'company_documents_object_delete'
  ) then
    raise exception 'Authenticated users must not directly delete Vault Storage objects';
  end if;

  if not has_column_privilege('authenticated', 'public.company_documents', 'document_name', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.company_documents', 'expiry_date', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.company_documents', 'deleted_at', 'UPDATE')
     or has_column_privilege('authenticated', 'public.company_documents', 'verification_status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.company_documents', 'verified_doc_type', 'UPDATE') then
    raise exception 'Authenticated updates must be limited to document name, expiry and Bin state';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date)'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_register;

  if position('private.is_company_member(p_company_id)' in v_register) = 0
     or position('c.is_active is true' in v_register) = 0
     or position('storage.objects' in v_register) = 0
     or position('p_file_size > 20971520' in v_register) = 0
     or position('p_mime_type is null' in v_register) = 0
     or position('p_sha256_hash is null' in v_register) = 0
     or position('p_expiry_date' in v_register) = 0
     or position('p_company_id::text' in v_register) = 0
     or position('set search_path to ''''' in v_register) = 0 then
    raise exception 'New upload RPC is missing tenant, file, hash, path, expiry, or search_path validation';
  end if;

  if has_function_privilege('authenticated',
       'public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date)'::regprocedure,'EXECUTE')
     or has_function_privilege('anon',
       'public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date)'::regprocedure,'EXECUTE') then
    raise exception 'Legacy caller-hash upload RPC must not be executable by browser roles';
  end if;
  if not has_function_privilege('service_role',
       'public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date,uuid)'::regprocedure,'EXECUTE')
     or has_function_privilege('authenticated',
       'public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date,uuid)'::regprocedure,'EXECUTE') then
    raise exception 'Trusted upload RPC must be service-role-only';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date,uuid)'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_trusted_register;

  if position('p_uploaded_by' in v_trusted_register) = 0
     or position('vault_storage_cleanup' in v_trusted_register) = 0
     or position('organization_members' in v_trusted_register) = 0
     or position('company_members' in v_trusted_register) = 0
     or position('storage.objects' in v_trusted_register) = 0
     or position('p_sha256_hash' in v_trusted_register) = 0 then
    raise exception 'Trusted upload RPC must bind the uploader, require a pending intent, and validate the server digest/object';
  end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='vault_storage_cleanup' and c.relrowsecurity)
    or has_table_privilege('authenticated','public.vault_storage_cleanup','SELECT')
    or not has_table_privilege('service_role','public.vault_storage_cleanup','INSERT,UPDATE,SELECT') then
    raise exception 'Cleanup ledger must be RLS-enabled and service-role-only';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text)'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_legacy_wrapper;

  if position('public.register_document_upload(' in v_legacy_wrapper) = 0
     or position('null::date' in v_legacy_wrapper) = 0
     or position('set search_path to ''''' in v_legacy_wrapper) = 0 then
    raise exception 'Legacy upload RPC must remain as a hardened compatibility wrapper';
  end if;

  select regexp_replace(lower(pg_get_functiondef(
    'private.guard_company_document_scope()'::regprocedure
  )), E'\\s+', ' ', 'g')
  into v_scope_guard;

  if position('tenant scope is immutable' in v_scope_guard) = 0
     or position('organization_id = new.organization_id' in v_scope_guard) = 0 then
    raise exception 'Company document tenant scope trigger is incomplete';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.company_documents'::regclass
      and tgname = 'trg_guard_company_document_scope'
      and not tgisinternal
  ) then
    raise exception 'Company document tenant scope trigger is missing';
  end if;

  select lower(pg_get_functiondef('public.current_organization_id()'::regprocedure))
  into v_current_org;

  if position('set search_path to ''''' in v_current_org) = 0 then
    raise exception 'current_organization_id must use an empty search_path';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'company_documents'
      and indexname = 'company_documents_company_hash_active_uq'
      and indexdef ilike '%unique%'
      and indexdef ilike '%document_status = ''active''%'
  ) then
    raise exception 'Company-scoped active-document hash index is missing';
  end if;

  if exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'company_documents'
      and indexname = 'uq_company_document_hash'
  ) then
    raise exception 'Legacy organization-wide hash uniqueness index must be removed';
  end if;

  if not has_table_privilege('service_role', 'public.audit_logs', 'INSERT')
     or has_table_privilege('authenticated', 'public.audit_logs', 'INSERT') then
    raise exception 'Audit log insert must be service_role-only';
  end if;

  if not has_table_privilege('service_role', 'public.company_documents', 'DELETE') then
    raise exception 'Service role needs document delete permission for the audited delete function';
  end if;

  if exists (
    select 1
    from public.company_documents d
    left join public.companies c on c.id = d.company_id
    where c.id is null
       or d.organization_id is distinct from c.organization_id
  ) then
    raise exception 'Company document tenant mismatch detected';
  end if;

  if exists (
    select 1
    from public.company_documents
    where sha256_hash is not null and deleted_at is null and document_status = 'active'
    group by company_id, sha256_hash
    having count(*) > 1
  ) then
    raise exception 'Duplicate active document hashes exist within a company';
  end if;
end;
$$;
