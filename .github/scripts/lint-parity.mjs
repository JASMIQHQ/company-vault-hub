/* global process, console */
import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseSha = process.env.LINT_BASE_SHA;
const headSha = process.env.LINT_HEAD_SHA;
if (!baseSha || !headSha || /^0+$/.test(baseSha)) {
  console.error("Lint parity requires valid base and head SHAs.");
  process.exit(2);
}

const root = process.cwd();
const workRoot = path.join(os.tmpdir(), `jasmiq-lint-parity-${process.pid}`);
const baseDir = path.join(workRoot, "base");
const headDir = path.join(workRoot, "head");
const outputDir = path.join(process.env.RUNNER_TEMP || os.tmpdir(), "jasmiq-lint-parity");
const baseJson = path.join(outputDir, "base.json");
const headJson = path.join(outputDir, "head.json");
const newJson = path.join(outputDir, "new-findings.json");

function run(command, args, cwd = root, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  return result;
}

function requireSuccess(command, args, cwd) {
  const result = run(command, args, cwd);
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(" ")}`);
  }
}

async function lintAt(sha, directory, outputFile) {
  requireSuccess("git", ["worktree", "add", "--detach", directory, sha], root);
  requireSuccess("bun", ["install", "--frozen-lockfile"], directory);
  const result = run(
    "bunx",
    ["eslint", ".", "--format", "json", "--output-file", outputFile],
    directory,
    { capture: true },
  );
  // ESLint exit code 1 means lint findings exist; 2 means configuration/runtime failure.
  if (result.status !== 0 && result.status !== 1) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`ESLint could not complete for ${sha} (exit ${result.status}).`);
  }
}

function loadFindings(jsonPath, workspace) {
  const files = JSON.parse(requireText(jsonPath));
  const counts = new Map();
  let errors = 0;
  let warnings = 0;
  for (const file of files) {
    const filePath = path
      .relative(workspace, path.resolve(file.filePath))
      .split(path.sep)
      .join("/");
    for (const message of file.messages || []) {
      const finding = {
        file: filePath,
        ruleId: message.ruleId ?? "(no-rule)",
        severity: message.severity,
        message: message.message,
      };
      const key = JSON.stringify(finding);
      counts.set(key, (counts.get(key) || 0) + 1);
      if (message.severity === 2) errors++;
      else if (message.severity === 1) warnings++;
    }
  }
  return { counts, errors, warnings, total: errors + warnings };
}

function requireText(file) {
  return readFileSync(file, "utf8");
}

import { readFileSync, writeFileSync } from "node:fs";

try {
  await mkdir(outputDir, { recursive: true });
  await mkdir(workRoot, { recursive: true });
  await lintAt(baseSha, baseDir, baseJson);
  await lintAt(headSha, headDir, headJson);

  const base = loadFindings(baseJson, baseDir);
  const head = loadFindings(headJson, headDir);
  const remaining = new Map(base.counts);
  const introduced = [];
  for (const [key, count] of head.counts) {
    const known = remaining.get(key) || 0;
    const extra = count - known;
    if (extra > 0) {
      const finding = JSON.parse(key);
      for (let i = 0; i < extra; i++) introduced.push(finding);
    }
    if (known > count) remaining.set(key, known - count);
    else remaining.delete(key);
  }

  writeFileSync(newJson, JSON.stringify(introduced, null, 2) + "\n");
  const report = [
    "# Lint parity",
    "",
    `- Base: \`${baseSha}\``,
    `- Head: \`${headSha}\``,
    `- Base findings: ${base.total} (${base.errors} errors, ${base.warnings} warnings)`,
    `- Head findings: ${head.total} (${head.errors} errors, ${head.warnings} warnings)`,
    `- Newly introduced findings: ${introduced.length}`,
    "",
    introduced.length
      ? introduced
          .slice(0, 100)
          .map((item) => `- \`${item.file}\` — ${item.ruleId}: ${item.message}`)
          .join("\n")
      : "No new lint findings were detected relative to the base commit.",
  ].join("\n");

  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
  }
  if (introduced.length > 0) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 2;
} finally {
  for (const directory of [baseDir, headDir]) {
    run("git", ["worktree", "remove", "--force", directory], root, { capture: true });
  }
  await rm(workRoot, { recursive: true, force: true });
}
