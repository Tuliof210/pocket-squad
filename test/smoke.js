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

// Keep the test offline and fast: skip the ensure-step that fetches impeccable/ponytail.
const env = { ...process.env, POCKET_SQUAD_SKIP_SKILLS: "1" };

try {
  // execFileSync throws (and this test crashes) on a non-zero exit code — that's the "exits 0" assertion.
  execFileSync("node", [CLI, "install"], { cwd: dir, env });

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
    fs.existsSync(path.join(dir, ".claude", "commands", "ps", "run.md")),
    "install should create the namespaced /ps:run command"
  );
  assert.ok(
    !fs.existsSync(path.join(dir, ".claude", "commands", "approve.md")),
    "the removed /approve command must not ship"
  );

  for (const skill of ["ps-backend-api", "ps-backend-data", "ps-backend-security"]) {
    assert.ok(
      fs.existsSync(path.join(dir, ".claude", "skills", skill, "SKILL.md")),
      `install should bundle the ${skill} skill`
    );
  }

  // impeccable and ponytail are NOT part of the package — only fetched by the
  // ensure-step (skipped here), so a bundled copy would be a packaging bug.
  for (const skill of ["impeccable", "ponytail-review"]) {
    assert.ok(
      !fs.existsSync(path.join(dir, ".claude", "skills", skill)),
      `${skill} must not ship inside the package`
    );
  }

  assert.ok(
    fs.existsSync(path.join(dir, ".squad", "project-context.md")),
    "install should create .squad/project-context.md"
  );

  const statusOutput = execFileSync("node", [CLI, "status"], { cwd: dir, env }).toString();
  assert.ok(statusOutput.includes("managed"), "status output should contain 'managed'");

  console.log("smoke test passed");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
