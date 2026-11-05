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
const unexpectedHistorical = actual
  .filter((version) => !expectedSet.has(version) && version <= expected.at(-1))
  .sort();
const appended = [...new Set(actual.filter((version) => version > expected.at(-1)))].sort();

console.log(`Expected live-ledger baseline versions: ${expected.length}`);
console.log(`SQL migration files found: ${sqlFiles.length}`);
console.log(`Unique version prefixes found: ${actualSet.size}`);
console.log(`Append-only migrations newer than the 2026-10-29 ledger snapshot: ${appended.length}`);
if (missing.length) console.error(`Missing live versions: ${missing.join(", ")}`);
if (unexpectedHistorical.length) {
  console.error(`Unexpected versions at or before the live-ledger boundary: ${unexpectedHistorical.join(", ")}`);
}
if (duplicates.length) console.error(`Duplicate version prefixes: ${duplicates.join(", ")}`);
if (invalidNames.length) console.error(`Invalid migration filenames: ${invalidNames.join(", ")}`);

if (
  expected.length !== 66 ||
  expectedSet.size !== expected.length ||
  actual.length !== actualSet.size ||
  missing.length > 0 ||
  unexpectedHistorical.length > 0 ||
  duplicates.length > 0 ||
  invalidNames.length > 0
) {
  console.error(
    "FAIL: the 66-version live-ledger baseline must be exact; only unique, newer append-only migrations are permitted.",
  );
  process.exit(1);
}

console.log("PASS: exact 66-version live baseline plus a unique append-only migration tail.");
if (appended.length) console.log(`New migration tail: ${appended.join(", ")}`);
