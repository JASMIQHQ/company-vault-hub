import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile, rm, mkdtemp as fsMkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const base = process.env.LINT_BASE_SHA;
const head = process.env.LINT_HEAD_SHA;
if (!base || !head || /^0+$/.test(base)) {
  throw new Error("Valid base/head SHAs are required.");
}

const root = process.cwd();
const temp = await fsMkdtemp(path.join(os.tmpdir(), "jasmiq-lint-"));
const out = path.join(process.env.RUNNER_TEMP || os.tmpdir(), "jasmiq-lint-parity");
const findings = [];

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env: process.env });
  if (r.error) throw r.error;
  return r;
}

async function lint(sha, dir) {
  let r = run("git", ["worktree", "add", "--detach", dir, sha]);
  if (r.status) throw new Error(r.stderr || "Unable to create worktree");

  r = run("bun", ["install", "--frozen-lockfile"], dir);
  if (r.status) throw new Error(r.stderr || "Dependency installation failed");

  r = run(
    "bunx",
    ["eslint", ".", "--format", "json", "--output-file", path.join(out, sha + ".json")],
    dir,
  );
  if (r.status !== 0 && r.status !== 1) {
    throw new Error(r.stderr || "ESLint execution failed");
  }
}

try {
  await mkdir(out, { recursive: true });
  const baseDir = path.join(temp, "base");
  const headDir = path.join(temp, "head");
  await lint(base, baseDir);
  await lint(head, headDir);

  async function normalized(sha, dir) {
    const files = JSON.parse(await readFile(path.join(out, sha + ".json"), "utf8"));
    const list = [];

    for (const f of files) {
      for (const m of f.messages || []) {
        list.push(
          JSON.stringify({
            file: path.relative(dir, f.filePath).split(path.sep).join("/"),
            rule: m.ruleId,
            severity: m.severity,
            message: m.message,
          }),
        );
      }
    }

    return list.sort();
  }

  const before = await normalized(base, baseDir);
  const after = await normalized(head, headDir);
  const remaining = new Map();

  for (const x of before) {
    remaining.set(x, (remaining.get(x) || 0) + 1);
  }

  const added = [];
  for (const x of after) {
    const n = remaining.get(x) || 0;
    if (n) remaining.set(x, n - 1);
    else added.push(x);
  }

  const report = [
    "# Lint parity",
    "",
    "Base findings: " + before.length,
    "Head findings: " + after.length,
    "New findings: " + added.length,
    "",
    ...added.slice(0, 100).map((x) => "- " + x),
  ].join("\n");

  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, report + "\n");
  }
  await writeFile(path.join(out, "new-findings.json"), JSON.stringify(added, null, 2) + "\n");
  if (added.length) process.exitCode = 1;
} finally {
  for (const name of ["base", "head"]) {
    run("git", ["worktree", "remove", "--force", path.join(temp, name)]);
  }
  await rm(temp, { recursive: true, force: true });
}
