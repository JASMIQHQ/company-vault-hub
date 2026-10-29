#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationDir = "supabase/migrations";
const manifestPath = join(migrationDir, "live-ledger-versions-2026-10-29.txt");
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

console.log(`Expected live-ledger versions: ${expected.length}`);
console.log(`SQL migration files found: ${sqlFiles.length}`);
console.log(`Unique version prefixes found: ${actualSet.size}`);
if (missing.length) console.error(`Missing live versions: ${missing.join(", ")}`);
if (extra.length) console.error(`Unrecognized extra versions: ${[...new Set(extra)].sort().join(", ")}`);
if (duplicates.length) console.error(`Duplicate version prefixes: ${duplicates.join(", ")}`);
if (invalidNames.length) console.error(`Invalid migration filenames: ${invalidNames.join(", ")}`);

if (
  expected.length !== 66 ||
  actual.length !== expected.length ||
  actualSet.size !== expectedSet.size ||
  missing.length > 0 ||
  extra.length > 0 ||
  duplicates.length > 0 ||
  invalidNames.length > 0
) {
  console.error(
    "FAIL: migration filenames do not exactly match the recorded live migration ledger.",
  );
  process.exit(1);
}

console.log(
  "PASS: migration version set exactly matches the recorded 66-version live ledger.",
);
