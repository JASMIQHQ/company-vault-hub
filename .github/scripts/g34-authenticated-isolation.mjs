#!/usr/bin/env node
/**
 * Authenticated G34/G35 tenant-boundary acceptance test. Validates distinct user identities first.
 *
 * Uses two real, separately scoped Supabase user access tokens through the
 * public Data API. It intentionally never uses the service-role key and does
 * not mutate data. Run against a dedicated staging project with two users:
 * user A belongs to company A only; user B belongs to company B only.
 */
const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "G34_TEST_USER_A_TOKEN",
  "G34_TEST_USER_B_TOKEN",
  "G34_COMPANY_A_ID",
  "G34_COMPANY_B_ID",
  "G34_TENDER_A_ID",
  "G34_TENDER_B_ID",
];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`G34 test cannot start; missing environment variables: ${missing.join(", ")}`);
  process.exit(2);
}

const env = Object.fromEntries(required.map((key) => [key, process.env[key].trim()]));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
for (const key of ["G34_COMPANY_A_ID", "G34_COMPANY_B_ID", "G34_TENDER_A_ID", "G34_TENDER_B_ID"]) {
  if (!uuidPattern.test(env[key])) {
    console.error(`${key} must be a UUID`);
    process.exit(2);
  }
}
if (env.G34_COMPANY_A_ID === env.G34_COMPANY_B_ID || env.G34_TENDER_A_ID === env.G34_TENDER_B_ID) {
  console.error("The test requires distinct company IDs and distinct tender IDs.");
  process.exit(2);
}

const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
const checks = [];
async function rows(token, table, select, filters) {
  const url = new URL(`${baseUrl}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`${table} returned HTTP ${response.status}: ${detail}`);
  }
  const result = await response.json();
  if (!Array.isArray(result)) throw new Error(`${table} returned a non-array response`);
  return result;
}
function assert(name, condition, detail) {
  checks.push({ name, pass: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}
async function run() {
  const A = env.G34_TEST_USER_A_TOKEN;
  const B = env.G34_TEST_USER_B_TOKEN;
  const companyA = env.G34_COMPANY_A_ID;
  const companyB = env.G34_COMPANY_B_ID;
  const tenderA = env.G34_TENDER_A_ID;
  const tenderB = env.G34_TENDER_B_ID;

  // Establish that the two bearer tokens represent different authenticated
  // Supabase users before treating their reads as an isolation test.
  async function authenticatedUser(token, label) {
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`${label} token could not be validated (HTTP ${response.status}): ${detail}`);
    }
    const user = await response.json();
    if (typeof user.id !== "string" || !uuidPattern.test(user.id)) {
      throw new Error(`${label} token did not resolve to a valid authenticated user ID`);
    }
    return user.id;
  }
  const [userAId, userBId] = await Promise.all([
    authenticatedUser(A, "User A"),
    authenticatedUser(B, "User B"),
  ]);
  assert("User A and User B tokens resolve to distinct authenticated users", userAId !== userBId,
    userAId === userBId ? "Both tokens resolve to the same user; negative isolation evidence would be invalid" : "Distinct user identities confirmed");
  if (userAId === userBId) {
    console.error("Release gate FAILED before resource checks: use two different staging users.");
    process.exitCode = 1;
    return;
  }

  // Positive controls: each token can access its own company's real records.
  const [aDocs, bDocs, aTender, bTender] = await Promise.all([
    rows(A, "company_documents", "id,company_id", { company_id: `eq.${companyA}`, limit: "1" }),
    rows(B, "company_documents", "id,company_id", { company_id: `eq.${companyB}`, limit: "1" }),
    rows(A, "tenders", "id,company_id", { id: `eq.${tenderA}`, company_id: `eq.${companyA}` }),
    rows(B, "tenders", "id,company_id", { id: `eq.${tenderB}`, company_id: `eq.${companyB}` }),
  ]);
  assert("User A can read a Company A Vault document", aDocs.length > 0, `${aDocs.length} visible row(s)`);
  assert("User B can read a Company B Vault document", bDocs.length > 0, `${bDocs.length} visible row(s)`);
  assert("User A can read its Company A tender", aTender.length === 1, `${aTender.length} visible row(s)`);
  assert("User B can read its Company B tender", bTender.length === 1, `${bTender.length} visible row(s)`);

  // Negative controls: a company-scoped token must not enumerate the other
  // company's resources, even when both companies share an organization.
  const [aForeignDocs, bForeignDocs, aForeignTender, bForeignTender] = await Promise.all([
    rows(A, "company_documents", "id,company_id", { company_id: `eq.${companyB}`, limit: "5" }),
    rows(B, "company_documents", "id,company_id", { company_id: `eq.${companyA}`, limit: "5" }),
    rows(A, "tenders", "id,company_id", { id: `eq.${tenderB}` }),
    rows(B, "tenders", "id,company_id", { id: `eq.${tenderA}` }),
  ]);
  assert("User A cannot read Company B Vault documents", aForeignDocs.length === 0, `${aForeignDocs.length} foreign row(s) visible`);
  assert("User B cannot read Company A Vault documents", bForeignDocs.length === 0, `${bForeignDocs.length} foreign row(s) visible`);
  assert("User A cannot read Company B tender", aForeignTender.length === 0, `${aForeignTender.length} foreign row(s) visible`);
  assert("User B cannot read Company A tender", bForeignTender.length === 0, `${bForeignTender.length} foreign row(s) visible`);

  // Related resources are checked by persisted tender ownership, not by a
  // client-supplied company selector. Positive controls prevent empty tables
  // from making a negative-only isolation check pass vacuously.
  const relatedTables = [
    ["tender_requirements", "id,tender_id"],
    ["tender_files", "id,tender_id"],
    ["compliance_matches", "id,tender_id,document_id"],
    ["generated_documents", "id,tender_id"],
  ];
  for (const [table, select] of relatedTables) {
    const [aOwn, bOwn, aSeesB, bSeesA] = await Promise.all([
      rows(A, table, select, { tender_id: `eq.${tenderA}`, limit: "1" }),
      rows(B, table, select, { tender_id: `eq.${tenderB}`, limit: "1" }),
      rows(A, table, select, { tender_id: `eq.${tenderB}`, limit: "5" }),
      rows(B, table, select, { tender_id: `eq.${tenderA}`, limit: "5" }),
    ]);
    assert(`User A can read its Company A ${table} fixture`, aOwn.length > 0, `${aOwn.length} own row(s) visible`);
    assert(`User B can read its Company B ${table} fixture`, bOwn.length > 0, `${bOwn.length} own row(s) visible`);
    assert(`User A cannot read Company B ${table}`, aSeesB.length === 0, `${aSeesB.length} foreign row(s) visible`);
    assert(`User B cannot read Company A ${table}`, bSeesA.length === 0, `${bSeesA.length} foreign row(s) visible`);
  }

  const failures = checks.filter((check) => !check.pass);
  console.log(`\nG34 authenticated isolation: ${checks.length - failures.length}/${checks.length} checks passed.`);
  if (failures.length) {
    console.error("Release gate FAILED. Do not merge/deploy until each failure is resolved.");
    process.exitCode = 1;
  } else {
    console.log("Release gate passed for the tested staging fixtures only; this is not by itself production release approval.");
  }
}
run().catch((error) => {
  console.error(`G34 test execution error: ${error.message}`);
  process.exitCode = 1;
});
