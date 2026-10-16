import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20261016160000_g34_enforce_company_organization_consistency.sql";
const sql = (await readFile(migrationPath, "utf8")).toLowerCase();

function functionBody(name) {
  const start = sql.indexOf(`create or replace function public.${name}`);
  assert.notEqual(start, -1, `Missing replacement for ${name}`);
  const next = sql.indexOf("create or replace function public.", start + 1);
  return sql.slice(start, next === -1 ? undefined : next);
}

const upload = functionBody("register_document_upload");
assert.match(upload, /from public\.companies c/);
assert.match(upload, /c\.id\s*=\s*p_company_id/);
assert.match(upload, /c\.is_active\s*=\s*true/);
assert.match(upload, /private\.is_company_member\(p_company_id\)/);
assert.match(upload, /raise exception 'forbidden' using errcode\s*=\s*'42501'/);
assert.match(upload, /insert into public\.company_documents/);
assert.match(upload, /v_organization_id,\s*p_company_id/);
assert.doesNotMatch(upload, /v_organization_id\s*:=\s*public\.current_organization_id\(\)/);

const compliance = functionBody("calculate_tender_compliance");
assert.match(compliance, /from public\.tenders t/);
assert.match(compliance, /t\.company_id,\s*t\.organization_id/);
assert.match(compliance, /from public\.companies c/);
assert.match(compliance, /v_tender_org_id\s+is distinct from\s+v_company_org_id/);
assert.match(compliance, /private\.is_company_member\(v_company_id\)/);
assert.match(compliance, /raise exception 'forbidden' using errcode\s*=\s*'42501'/);
assert.match(compliance, /where id\s*=\s*p_tender_id\s+and company_id\s*=\s*v_company_id\s+and organization_id\s*=\s*v_company_org_id/);

console.log("G34 organisation-consistency migration static checks passed.");
