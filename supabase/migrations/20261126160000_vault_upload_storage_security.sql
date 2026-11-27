-- G42: private Vault/tender storage, tenant-safe upload registration, and audited file access.
-- Existing organization-prefixed objects remain readable through their document records.
-- New uploads use company-prefixed paths.

begin;

do $$
begin
  if exists (
    select 1
    from public.company_documents d
    left join public.companies c on c.id = d.company_id
    where c.id is null
       or d.organization_id is distinct from c.organization_id
  ) then
    raise exception 'Company document tenant mismatch exists; reconcile before G42';
  end if;
end;
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_members om
  where om.profile_id = public.current_profile_id()
  limit 1;
$$;

create or replace function private.guard_company_document_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and (
       new.company_id is distinct from old.company_id
       or new.organization_id is distinct from old.organization_id
     ) then
    raise exception 'Company document tenant scope is immutable';
  end if;

  if not exists (
    select 1
    from public.companies c
    where c.id = new.company_id
      and c.organization_id = new.organization_id
  ) then
    raise exception 'Company document organization does not match its company';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_company_document_scope()
from public, anon, authenticated, service_role;

drop trigger if exists trg_guard_company_document_scope
on public.company_documents;

create trigger trg_guard_company_document_scope
before insert or update of company_id, organization_id
on public.company_documents
for each row execute function private.guard_company_document_scope();

drop policy if exists company_documents_company_access on public.company_documents;
drop policy if exists company_documents_member_select on public.company_documents;
drop policy if exists company_documents_member_insert on public.company_documents;
drop policy if exists company_documents_member_update on public.company_documents;
drop policy if exists company_documents_member_delete on public.company_documents;

create policy company_documents_member_select
on public.company_documents
for select to authenticated
using (
  private.is_company_member(company_id)
  and exists (
    select 1
    from public.companies c
    where c.id = company_documents.company_id
      and c.organization_id = company_documents.organization_id
  )
);

create policy company_documents_member_insert
on public.company_documents
for insert to authenticated
with check (
  private.is_company_member(company_id)
  and exists (
    select 1
    from public.companies c
    where c.id = company_documents.company_id
      and c.organization_id = company_documents.organization_id
  )
  and uploaded_by = public.current_profile_id()
  and verification_status = 'unverified'
  and verified_doc_type is null
  and verified_year is null
  and verified_expiry_date is null
  and verified_at is null
  and analysis_status = 'pending'
  and analysis_json = '{}'::jsonb
  and document_status = 'active'
  and storage_path is not null
  and (
    split_part(storage_path, '/', 1) = company_id::text
    or split_part(storage_path, '/', 1) = organization_id::text
  )
  and file_size between 1 and 20971520
  and mime_type in ('application/pdf', 'image/png', 'image/jpeg')
  and sha256_hash ~ '^[0-9a-f]{64}$'
);

create policy company_documents_member_update
on public.company_documents
for update to authenticated
using (
  private.is_company_member(company_id)
  and exists (
    select 1
    from public.companies c
    where c.id = company_documents.company_id
      and c.organization_id = company_documents.organization_id
  )
)
with check (
  private.is_company_member(company_id)
  and exists (
    select 1
    from public.companies c
    where c.id = company_documents.company_id
      and c.organization_id = company_documents.organization_id
  )
);

create policy company_documents_member_delete
on public.company_documents
for delete to authenticated
using (
  deleted_at is not null
  and private.is_company_member(company_id)
  and exists (
    select 1
    from public.companies c
    where c.id = company_documents.company_id
      and c.organization_id = company_documents.organization_id
  )
);

revoke update on public.company_documents from authenticated;
grant update (document_name, expiry_date, deleted_at)
on public.company_documents to authenticated;

drop index if exists public.uq_company_document_hash;

create unique index if not exists company_documents_company_hash_active_uq
on public.company_documents (company_id, sha256_hash)
where sha256_hash is not null
  and deleted_at is null
  and document_status = 'active';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents',
  'company-documents',
  false,
  20971520,
  array['application/pdf', 'image/png', 'image/jpeg']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tender-files',
  'tender-files',
  false,
  20971520,
  array['application/pdf']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'company_documents_object_select'
  ) then
    create policy company_documents_object_select
    on storage.objects for select to authenticated
    using (
      bucket_id = 'company-documents'
      and exists (
        select 1
        from public.company_documents d
        join public.companies c
          on c.id = d.company_id
         and c.organization_id = d.organization_id
        where d.storage_path = name
          and (
            split_part(d.storage_path, '/', 1) = d.company_id::text
            or split_part(d.storage_path, '/', 1) = d.organization_id::text
          )
          and private.is_company_member(d.company_id)
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'company_documents_object_insert'
  ) then
    create policy company_documents_object_insert
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'company-documents'
      and (
        (
          split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.is_company_member(split_part(name, '/', 1)::uuid)
        )
        or (
          split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and owner = auth.uid()
          and public.is_org_member(split_part(name, '/', 1)::uuid)
        )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'company_documents_object_delete'
  ) then
    create policy company_documents_object_delete
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'company-documents'
      and (
        (
          split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.is_company_member(split_part(name, '/', 1)::uuid)
        )
        or (
          split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and owner = auth.uid()
          and public.is_org_member(split_part(name, '/', 1)::uuid)
        )
        or exists (
          select 1
          from public.company_documents d
          where d.storage_path = name
            and (
              split_part(d.storage_path, '/', 1) = d.company_id::text
              or split_part(d.storage_path, '/', 1) = d.organization_id::text
            )
            and private.is_company_member(d.company_id)
        )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'tender_files_object_select'
  ) then
    create policy tender_files_object_select
    on storage.objects for select to authenticated
    using (
      bucket_id = 'tender-files'
      and exists (
        select 1
        from public.tender_files tf
        join public.tenders t
          on t.id = tf.tender_id
         and t.organization_id = tf.organization_id
        where tf.storage_path = name
          and (
            split_part(tf.storage_path, '/', 1) = t.company_id::text
            or split_part(tf.storage_path, '/', 1) = t.organization_id::text
          )
          and private.is_company_member(t.company_id)
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'tender_files_object_insert'
  ) then
    create policy tender_files_object_insert
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'tender-files'
      and (
        (
          split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.is_company_member(split_part(name, '/', 1)::uuid)
        )
        or (
          split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and owner = auth.uid()
          and public.is_org_member(split_part(name, '/', 1)::uuid)
        )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'tender_files_object_delete'
  ) then
    create policy tender_files_object_delete
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'tender-files'
      and (
        (
          split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.is_company_member(split_part(name, '/', 1)::uuid)
        )
        or (
          split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and owner = auth.uid()
          and public.is_org_member(split_part(name, '/', 1)::uuid)
        )
        or exists (
          select 1
          from public.tender_files tf
          join public.tenders t
            on t.id = tf.tender_id
           and t.organization_id = tf.organization_id
          where tf.storage_path = name
            and (
              split_part(tf.storage_path, '/', 1) = t.company_id::text
              or split_part(tf.storage_path, '/', 1) = t.organization_id::text
            )
            and private.is_company_member(t.company_id)
        )
      )
    );
  end if;
end;
$$;

create or replace function public.register_document_upload(
  p_company_id uuid,
  p_category text,
  p_document_type text,
  p_document_name text,
  p_original_filename text,
  p_storage_path text,
  p_mime_type text,
  p_file_size bigint,
  p_sha256_hash text,
  p_expiry_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_organization_id uuid;
begin
  select c.organization_id
  into v_organization_id
  from public.companies c
  where c.id = p_company_id
    and c.is_active is true;

  if v_organization_id is null or not private.is_company_member(p_company_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if nullif(trim(p_category), '') is null
     or nullif(trim(p_document_type), '') is null
     or nullif(trim(p_document_name), '') is null
     or nullif(trim(p_original_filename), '') is null then
    raise exception 'document metadata is incomplete' using errcode = '22023';
  end if;

  if p_file_size is null or p_file_size < 1 or p_file_size > 20971520 then
    raise exception 'file size must be between 1 byte and 20 MB' using errcode = '22023';
  end if;

  if p_mime_type is null
     or p_mime_type not in ('application/pdf', 'image/png', 'image/jpeg') then
    raise exception 'unsupported document MIME type' using errcode = '22023';
  end if;

  if p_sha256_hash is null
     or p_sha256_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid SHA-256 hash' using errcode = '22023';
  end if;

  if p_storage_path is null
     or p_storage_path !~ (
       '^' || p_company_id::text || '/[A-Za-z0-9._-]+/[0-9]+_[A-Za-z0-9._-]+$'
     ) then
    raise exception 'storage path must be company-prefixed and sanitized' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'company-documents'
      and o.name = p_storage_path
  ) then
    raise exception 'uploaded storage object was not found';
  end if;

  if exists (
    select 1
    from public.company_documents d
    where d.company_id = p_company_id
      and d.sha256_hash = p_sha256_hash
      and d.deleted_at is null
      and d.document_status = 'active'
  ) then
    raise exception 'duplicate document already exists in this company'
      using errcode = '23505';
  end if;

  insert into public.company_documents (
    organization_id,
    company_id,
    uploaded_by,
    category,
    document_type,
    document_name,
    original_filename,
    storage_path,
    mime_type,
    file_size,
    sha256_hash,
    expiry_date,
    analysis_status,
    document_status,
    version
  )
  values (
    v_organization_id,
    p_company_id,
    public.current_profile_id(),
    p_category,
    p_document_type,
    p_document_name,
    p_original_filename,
    p_storage_path,
    p_mime_type,
    p_file_size,
    p_sha256_hash,
    p_expiry_date,
    'pending',
    'active',
    1
  )
  returning id into v_document_id;

  return v_document_id;
end;
$$;

create or replace function public.register_document_upload(
  p_company_id uuid,
  p_category text,
  p_document_type text,
  p_document_name text,
  p_original_filename text,
  p_storage_path text,
  p_mime_type text,
  p_file_size bigint,
  p_sha256_hash text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.register_document_upload(
    p_company_id,
    p_category,
    p_document_type,
    p_document_name,
    p_original_filename,
    p_storage_path,
    p_mime_type,
    p_file_size,
    p_sha256_hash,
    null::date
  );
$$;

revoke all on function public.register_document_upload(
  uuid, text, text, text, text, text, text, bigint, text, date
) from public, anon;

revoke all on function public.register_document_upload(
  uuid, text, text, text, text, text, text, bigint, text
) from public, anon;

grant execute on function public.register_document_upload(
  uuid, text, text, text, text, text, text, bigint, text, date
) to authenticated, service_role;

grant execute on function public.register_document_upload(
  uuid, text, text, text, text, text, text, bigint, text
) to authenticated, service_role;

grant insert on public.audit_logs to service_role;
revoke insert, update, delete on public.audit_logs from anon, authenticated;

grant delete on public.company_documents to service_role;


create table if not exists public.vault_storage_cleanup (
 id uuid primary key default gen_random_uuid(),
 bucket_id text not null check(bucket_id='company-documents'),
 storage_path text not null,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 action text not null check(action in ('upload','delete')),
 document_id uuid references public.company_documents(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','completed')),
 attempts integer not null default 0 check(attempts>=0),
 last_error text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.vault_storage_cleanup enable row level security;
revoke all on public.vault_storage_cleanup from public,anon,authenticated;
grant select,insert,update,delete on public.vault_storage_cleanup to service_role;
create unique index if not exists vault_storage_cleanup_pending_path_uq
 on public.vault_storage_cleanup(bucket_id,storage_path,action) where status='pending';
create index if not exists vault_storage_cleanup_retry_idx
 on public.vault_storage_cleanup(status,action,created_at) where status='pending';

create or replace function public.register_document_upload(
 p_company_id uuid,p_category text,p_document_type text,p_document_name text,
 p_original_filename text,p_storage_path text,p_mime_type text,p_file_size bigint,
 p_sha256_hash text,p_expiry_date date,p_uploaded_by uuid
) returns uuid language plpgsql security definer set search_path=''
as $
declare v_document_id uuid; v_organization_id uuid;
begin
 select c.organization_id into v_organization_id from public.companies c
 where c.id=p_company_id and c.is_active is true;
 if v_organization_id is null
 or not exists(select 1 from public.organization_members om where om.profile_id=p_uploaded_by and om.organization_id=v_organization_id)
 or not exists(select 1 from public.company_members cm where cm.profile_id=p_uploaded_by and cm.company_id=p_company_id and cm.organization_id=v_organization_id)
 then raise exception 'forbidden' using errcode='42501'; end if;
 if not exists(select 1 from public.vault_storage_cleanup q where q.company_id=p_company_id
 and q.organization_id=v_organization_id and q.profile_id=p_uploaded_by and q.storage_path=p_storage_path
 and q.action='upload' and q.status='pending')
 then raise exception 'upload intent not found' using errcode='42501'; end if;
 if nullif(trim(p_category),'') is null or nullif(trim(p_document_type),'') is null
 or nullif(trim(p_document_name),'') is null or nullif(trim(p_original_filename),'') is null
 then raise exception 'document metadata is incomplete' using errcode='22023'; end if;
 if p_file_size is null or p_file_size<1 or p_file_size>20971520
 then raise exception 'file size must be between 1 byte and 20 MB' using errcode='22023'; end if;
 if p_mime_type is null or p_mime_type not in ('application/pdf','image/png','image/jpeg')
 then raise exception 'unsupported document MIME type' using errcode='22023'; end if;
 if p_sha256_hash is null or p_sha256_hash !~ '^[0-9a-f]{64}
 then raise exception 'invalid SHA-256 hash' using errcode='22023'; end if;
 if p_storage_path is null or p_storage_path !~ ('^'||p_company_id::text||'/[A-Za-z0-9._-]+/[0-9]+_[A-Za-z0-9._-]+)
 then raise exception 'storage path must be company-prefixed and sanitized' using errcode='22023'; end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='company-documents' and o.name=p_storage_path)
 then raise exception 'uploaded storage object was not found'; end if;
 if exists(select 1 from public.company_documents d where d.company_id=p_company_id and d.sha256_hash=p_sha256_hash and d.deleted_at is null and d.document_status='active')
 then raise exception 'duplicate document already exists in this company' using errcode='23505'; end if;
 insert into public.company_documents(organization_id,company_id,uploaded_by,category,document_type,document_name,
 original_filename,storage_path,mime_type,file_size,sha256_hash,expiry_date,analysis_status,document_status,version)
 values(v_organization_id,p_company_id,p_uploaded_by,p_category,p_document_type,p_document_name,
 p_original_filename,p_storage_path,p_mime_type,p_file_size,p_sha256_hash,p_expiry_date,'pending','active',1)
 returning id into v_document_id;
 update public.vault_storage_cleanup set status='completed',completed_at=now(),updated_at=now(),
 document_id=v_document_id,last_error=null where company_id=p_company_id and storage_path=p_storage_path
 and action='upload' and status='pending';
 return v_document_id;
end; $;

revoke all on function public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date) from public,anon,authenticated;
revoke all on function public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text) from public,anon,authenticated;
revoke all on function public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date,uuid) from public,anon,authenticated;
grant execute on function public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text,date,uuid) to service_role;


-- Browser roles must not bypass the audited upload/delete Edge Function.
revoke insert, delete on public.company_documents from public, anon, authenticated;
drop policy if exists company_documents_object_delete on storage.objects;

commit;
