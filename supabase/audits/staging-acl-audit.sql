-- Read-only staging ACL audit. Run as a role that can inspect PostgreSQL catalogs.
-- This file contains SELECT statements only; it does not change grants or schema.

-- 1. Effective forbidden table privileges. Expected: zero rows.
SELECT n.nspname AS schema_name,
       c.relname AS object_name,
       r.rolname AS grantee,
       p.privilege_type
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN pg_roles AS r
CROSS JOIN (VALUES ('TRUNCATE'), ('MAINTAIN')) AS p(privilege_type)
WHERE n.nspname IN ('public', 'private')
  AND c.relkind IN ('r', 'p')
  AND r.rolname IN ('anon', 'authenticated')
  AND has_table_privilege(r.oid, c.oid, p.privilege_type)
ORDER BY n.nspname, c.relname, r.rolname, p.privilege_type;

-- 2. Default ACLs for all object owners and schemas.
SELECT d.defaclrole::regrole AS object_owner,
       COALESCE(n.nspname, '<global>') AS schema_name,
       CASE d.defaclobjtype
         WHEN 'r' THEN 'tables'
         WHEN 'S' THEN 'sequences'
         WHEN 'f' THEN 'functions'
         WHEN 'T' THEN 'types'
         ELSE d.defaclobjtype::text
       END AS object_type,
       d.defaclacl AS default_acl
FROM pg_default_acl AS d
LEFT JOIN pg_namespace AS n ON n.oid = d.defaclnamespace
ORDER BY 1, 2, 3;

-- 3. RLS coverage for application tables. Expected: every exposed table has RLS.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'private')
  AND c.relkind IN ('r', 'p')
ORDER BY 1, 2;

-- 4. Effective sequence privileges for client roles; review against sequence use.
SELECT n.nspname AS schema_name,
       c.relname AS sequence_name,
       r.rolname AS grantee,
       p.privilege_type
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN pg_roles AS r
CROSS JOIN (VALUES ('USAGE'), ('SELECT'), ('UPDATE')) AS p(privilege_type)
WHERE c.relkind = 'S'
  AND n.nspname IN ('public', 'private')
  AND r.rolname IN ('anon', 'authenticated')
  AND has_sequence_privilege(r.oid, c.oid, p.privilege_type)
ORDER BY 1, 2, 3, 4;

-- 5. Public-schema routines executable by client roles; review SECURITY DEFINER first.
SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'private')
ORDER BY 1, 2, 3;
