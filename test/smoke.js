#!/usr/bin/env node
/**
 * Zero-dep smoke test for pocket-squad's CLI.
 * No test framework — node:assert only, per project convention.
 */
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const CLI = path.join(REPO_ROOT, "bin", "pocket-squad.js");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-squad-"));

try {
  // execFileSync throws (and this test crashes) on a non-zero exit code — that's the "exits 0" assertion.
  execFileSync("node", [CLI, "install"], { cwd: dir });

  assert.ok(
    fs.existsSync(path.join(dir, ".claude", "pocket-squad.manifest.json")),
    "install should create .claude/pocket-squad.manifest.json"
  );

  const agentsDir = path.join(dir, ".claude", "agents");
  assert.ok(fs.existsSync(agentsDir), "install should create .claude/agents/");
  assert.ok(
    fs.readdirSync(agentsDir).length > 0,
    "install should create at least one file under .claude/agents/"
  );

  assert.ok(
    fs.existsSync(path.join(dir, ".squad", "project-context.md")),
    "install should create .squad/project-context.md"
  );

  const statusOutput = execFileSync("node", [CLI, "status"], { cwd: dir }).toString();
  assert.ok(statusOutput.includes("managed"), "status output should contain 'managed'");

  console.log("smoke test passed");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
