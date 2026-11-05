-- Read-only schema fingerprint for comparing production and staging.
-- Run this unchanged in both projects' SQL editors, export results as CSV,
-- and compare by object_key. This intentionally excludes application row data.
with objects as (
  select
    'function:' || n.nspname || '.' || p.proname || '(' ||
      pg_get_function_identity_arguments(p.oid) || ')' as object_key,
    md5(pg_get_functiondef(p.oid)) as fingerprint
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')

  union all

  select
    'policy:' || schemaname || '.' || tablename || '.' || policyname,
    md5(concat_ws('|', cmd, roles::text, coalesce(qual, ''), coalesce(with_check, '')))
  from pg_policies
  where schemaname in ('public', 'private', 'storage')

  union all

  select
    'column:' || table_schema || '.' || table_name || '.' || column_name,
    md5(concat_ws('|',
      data_type,
      udt_name,
      is_nullable,
      coalesce(column_default, ''),
      coalesce(character_maximum_length::text, ''),
      coalesce(numeric_precision::text, ''),
      coalesce(numeric_scale::text, '')
    ))
  from information_schema.columns
  where table_schema in ('public', 'private', 'storage')

  union all

  select
    'index:' || schemaname || '.' || tablename || '.' || indexname,
    md5(indexdef)
  from pg_indexes
  where schemaname in ('public', 'private', 'storage')

  union all

  select
    'trigger:' || n.nspname || '.' || c.relname || '.' || t.tgname,
    md5(pg_get_triggerdef(t.oid))
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal
    and n.nspname in ('public', 'private', 'storage')

  union all

  select
    'constraint:' || n.nspname || '.' || c.relname || '.' || con.conname,
    md5(pg_get_constraintdef(con.oid, true))
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private', 'storage')

  union all

  select
    'rls:' || n.nspname || '.' || c.relname,
    md5(concat_ws('|', c.relrowsecurity::text, c.relforcerowsecurity::text))
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p')
    and n.nspname in ('public', 'private', 'storage')

  union all

  select
    'grant:' || table_schema || '.' || table_name || '.' || grantee || '.' || privilege_type,
    md5(concat_ws('|', is_grantable))
  from information_schema.role_table_grants
  where table_schema in ('public', 'private', 'storage')

  union all

  select
    'enum:' || n.nspname || '.' || t.typname || '.' || e.enumsortorder::text,
    md5(e.enumlabel)
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname in ('public', 'private')

  union all

  select
    'extension:' || e.extname,
    md5(concat_ws('|', e.extversion, n.nspname))
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace

  union all

  select
    'bucket:' || id,
    md5(concat_ws('|', name, public::text, coalesce(file_size_limit::text, ''),
      coalesce(allowed_mime_types::text, '')))
  from storage.buckets
)
select object_key, fingerprint
from objects
order by object_key;
