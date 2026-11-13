# Staging grants allowlist — review required

This directory is the security boundary for restoring a production schema into the isolated JASMIQ staging project.

## Current status

**No staging grants allowlist is approved yet. Do not restore the schema.**

The old line-oriented regex sanitizer is retired. It is not a valid SQL privilege transformation and must not be reintroduced.

The replacement design is:

1. Export only the application schemas with PostgreSQL `pg_dump --schema-only --no-privileges --no-owner`.
2. Restore the schema into the isolated staging project only after confirming it is empty and its required extensions exist.
3. Revoke inherited target-project privileges and default privileges for `anon` and `authenticated` (and review `PUBLIC`).
4. Apply a reviewed, explicit allowlist of table-, sequence-, and function-level privileges.
5. Verify effective privileges from PostgreSQL catalogs and verify RLS/policies.
6. Do not certify staging until all checks pass.

## Production catalog observations (read-only, 2026-11-13)

The production catalog was queried without modifying it:

- Application schemas include `public` and `private`.
- 57 application tables were observed in those schemas; all had RLS enabled.
- 51 public tables showed effective `TRUNCATE`, `REFERENCES`, `TRIGGER`, and PostgreSQL 17 `MAINTAIN` privileges for `anon`.
- The same 51 public tables showed those four privileges for `authenticated`.
- The `public` default ACLs include entries owned by both `postgres` and `supabase_admin`. The `postgres` table defaults include `TRUNCATE`, `REFERENCES`, `TRIGGER`, and `MAINTAIN` for client roles; the `supabase_admin` table defaults are broader and include DML privileges as well.
- Sequence and function default ACLs also exist and require separate review; table-only revocation is insufficient.
- Supabase Security Advisor reported 16 RLS-enabled tables with no policies, 19 SECURITY DEFINER functions callable by authenticated users, and 2 extensions installed in the public schema. These need object-by-object review before copying any function grants or deciding which tables should be exposed.
- Supabase Auth's leaked-password protection is disabled (one advisor warning). This is outside the schema restore scope and is not changed here.

These are observations about the current production catalog, **not instructions to change production**. Production was read-only during this audit. Do not copy these broad ACLs into staging.

## Why the allowlist is not being guessed

RLS policies and SQL privileges are separate controls. A policy does not replace the table privilege required to call the Data API. Conversely, granting all DML to `authenticated` on every table is not an acceptable default for a multi-company procurement system.

Before writing grants, map every table and RPC/function to the application access path, RLS policy, and intended role. Explicitly review sequences and SECURITY DEFINER functions. Never grant `TRUNCATE` or `MAINTAIN` to `anon` or `authenticated`.

## Staging connection status

The Supabase read-only SQL connector returned PostgreSQL `28P01 password authentication failed for user "postgres"` for the staging project. This is not proof that the GitHub environment secret is empty or wrong; it means staging catalog verification has not yet been completed through that connector. The GitHub restore workflow must separately validate its staging connection before any restore is enabled.

## Required sign-off before enabling restore

- [ ] Fresh schema export artifact and SHA-256 verified.
- [ ] Required extensions and target schemas inventoried.
- [ ] Staging is the exact project `rmtoaaxnuwsecmajhwjx`.
- [ ] Staging is confirmed empty or a separately approved reset plan exists.
- [ ] Table grants mapped to actual app access and RLS policies.
- [ ] Sequence grants reviewed.
- [ ] Function EXECUTE grants and SECURITY DEFINER routines reviewed.
- [ ] Default ACLs reviewed for every object owner and schema.
- [ ] Effective staging ACL audit returns zero forbidden client-role privileges.
- [ ] Restore and post-restore verification run completed with retained evidence.

Until every item is satisfied, the restore workflow remains deliberately fail-closed.
