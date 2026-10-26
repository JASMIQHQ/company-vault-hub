import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const path = "supabase/migrations/20261016160000_g34_enforce_company_organization_consistency.sql";
const sql = (await readFile(path, "utf8")).toLowerCase();
const uploadStart = sql.indexOf("create or replace function public.register_document_upload");
const complianceStart = sql.indexOf(
  "create or replace function public.calculate_tender_compliance",
);
assert.ok(
  uploadStart >= 0 && complianceStart > uploadStart,
  "Expected both RPC replacements in order",
);
const upload = sql.slice(uploadStart, complianceStart);
const rest = sql.slice(complianceStart);
for (const fragment of [
  "from public.companies c",
  "where c.id = p_company_id and c.is_active = true",
  "private.is_company_member(p_company_id)",
  "insert into public.company_documents",
  "v_organization_id, p_company_id",
]) {
  assert.ok(upload.includes(fragment), `Upload guard missing: ${fragment}`);
}
assert.ok(
  !upload.includes("v_organization_id:=public.current_organization_id()"),
  "Upload must not use ambiguous current organisation helper",
);
for (const fragment of [
  "t.company_id, t.organization_id",
  "v_tender_org_id is distinct from v_company_org_id",
  "private.is_company_member(v_company_id)",
  "where id = p_tender_id and company_id = v_company_id",
  "organization_id = v_company_org_id",
  "create policy company_documents_company_access",
  "c.organization_id = company_documents.organization_id",
  "create policy tenders_company_access",
  "c.organization_id = tenders.organization_id",
  "revoke execute on function public.register_document_upload",
  "revoke execute on function public.calculate_tender_compliance",
]) {
  assert.ok(rest.includes(fragment), `Tenant guard missing: ${fragment}`);
}
assert.ok(rest.includes("from public.tenders t"), "Tender lookup must use persisted tender");

// Service-role Edge Functions bypass RLS and must enforce the same invariant
// independently before accessing tenant-owned tender data.
const matcher = (
  await readFile("supabase/functions/match-tender-evidence/index.ts", "utf8")
).toLowerCase();
const analyzer = (
  await readFile("supabase/functions/analyze-tender/index.ts", "utf8")
).toLowerCase();
for (const [name, source] of [
  ["match-tender-evidence", matcher],
  ["analyze-tender", analyzer],
]) {
  assert.ok(source.includes('.from("companies")'), `${name} must look up the persisted company`);
  assert.ok(
    source.includes("company.organization_id !== tender") ||
      source.includes("company.organization_id !== tenderrow"),
    `${name} must reject a company/tender organisation mismatch`,
  );
  assert.ok(source.includes("!company.is_active"), `${name} must reject an inactive company`);
}
console.log("G34 organisation-consistency migration and Edge Function guards passed.");
