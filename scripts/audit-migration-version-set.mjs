#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationDir = "supabase/migrations";
const manifestPath = join(migrationDir, "live-ledger-versions-2026-11-24.txt");
const expected = readFileSync(manifestPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const sqlFiles = readdirSync(migrationDir).filter((name) => name.endsWith(".sql"));
const actual = [];
const invalidNames = [];

for (const name of sqlFiles) {
  const match = name.match(/^(\d{14})_.+\.sql$/);
  if (!match) {
    invalidNames.push(name);
    continue;
  }
  actual.push(match[1]);
}

const duplicates = [
  ...new Set(actual.filter((version, index) => actual.indexOf(version) !== index)),
].sort();
const expectedSet = new Set(expected);
const actualSet = new Set(actual);
const missing = expected.filter((version) => !actualSet.has(version)).sort();
const extra = actual.filter((version) => !expectedSet.has(version)).sort();
const latestRecordedVersion = [...expected].sort().at(-1);
const outOfOrderExtras = extra.filter(
  (version) => !latestRecordedVersion || version <= latestRecordedVersion,
).sort();

console.log(`Expected live-ledger versions: ${expected.length}`);
console.log(`SQL migration files found: ${sqlFiles.length}`);
console.log(`Unique version prefixes found: ${actualSet.size}`);
if (missing.length) console.error(`Missing live versions: ${missing.join(", ")}`);
if (outOfOrderExtras.length) {
  console.error(
    `Unrecognized non-forward migration versions: ${[...new Set(outOfOrderExtras)].join(", ")}`,
  );
}
if (duplicates.length) console.error(`Duplicate version prefixes: ${duplicates.join(", ")}`);
if (invalidNames.length) console.error(`Invalid migration filenames: ${invalidNames.join(", ")}`);

if (
  expected.length !== 68 ||
  missing.length > 0 ||
  outOfOrderExtras.length > 0 ||
  duplicates.length > 0 ||
  invalidNames.length > 0
) {
  console.error(
    "FAIL: historical ledger baseline or forward-additive migration ordering is invalid.",
  );
  process.exit(1);
}

console.log(
  `PASS: recorded live-ledger baseline matches; ${extra.length} forward additive migration(s) are queued.`,
);
