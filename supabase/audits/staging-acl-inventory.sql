-- Read-only ACL inventory for the isolated JASMIQ staging baseline.
-- Run only after staging SQL connectivity is restored and the target project ref
-- has been independently confirmed as rmtoaaxnuwsecmajhwjx.
-- This file performs SELECTs only. It does not change grants, ownership, RLS,
-- schemas, data, Storage objects, or migration history.

-- 1) Effective relation ACLs, including PostgreSQL's implicit defaults when
-- relacl is NULL. This covers tables, views, materialized views, sequences,
-- and other pg_class relations in the application/Storage schemas.
select
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_type,
  coalesce(grantee.rolname, 'PUBLIC') as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(
  coalesce(
    c.relacl,
    acldefault(
      case when c.relkind = 'S' then 'S'::"char" else 'r'::"char" end,
      c.relowner
    )
  )
) acl
left join pg_roles grantee on grantee.oid = acl.grantee
where n.nspname in ('public', 'private', 'storage')
order by 1, 2, 4, 5;

-- 2) Schema-specific AND global default ACLs. A NULL schema_name denotes a
-- global default ACL; omitting these would leave part of the privilege
-- inheritance model unaudited.
select
  n.nspname as schema_name,
  owner_role.rolname as owner_role,
  coalesce(grantee.rolname, 'PUBLIC') as grantee,
  d.defaclobjtype as object_type,
  acl.privilege_type,
  acl.is_grantable
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
join pg_roles owner_role on owner_role.oid = d.defaclrole
cross join lateral aclexplode(d.defaclacl) acl
left join pg_roles grantee on grantee.oid = acl.grantee
where d.defaclnamespace = 0
   or n.nspname in ('public', 'private', 'storage')
order by 1 nulls first, 2, 3, 4, 5;
