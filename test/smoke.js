#!/usr/bin/env node
/**
 * Zero-dep smoke test for pocket-squad's CLI.
 * No test framework — node:assert only, per project convention.
 */
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const CLI = path.join(REPO_ROOT, "bin", "pocket-squad.js");
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-squad-"));

try {
  // execFileSync throws (and this test crashes) on a non-zero exit code — that's the "exits 0" assertion.
  execFileSync("node", [CLI, "install"], { cwd: dir });

  const MANIFEST = path.join(dir, ".claude", "pocket-squad.manifest.json");
  assert.ok(fs.existsSync(MANIFEST), "install should create .claude/pocket-squad.manifest.json");

  for (const cmd of ["story", "review", "publish", "init", "load", "run"]) {
    assert.ok(
      fs.existsSync(path.join(dir, ".claude", "commands", "ps", `${cmd}.md`)),
      `install should create the namespaced /ps:${cmd} command`
    );
  }

  // The v0.1 squad (agents, skills, techlead, status, project-context) must not ship.
  for (const gone of [
    path.join(".claude", "agents"),
    path.join(".claude", "skills"),
    path.join(".claude", "techlead.md"),
    path.join(".claude", "commands", "ps", "status.md"),
    path.join(".squad", "project-context.md"),
  ]) {
    assert.ok(!fs.existsSync(path.join(dir, gone)), `${gone} must not ship`);
  }

  assert.ok(
    fs.existsSync(path.join(dir, ".squad", "learnings.md")),
    "install should create .squad/learnings.md"
  );

  // The mechanical checks the commands delegate to. A syntax error here would fail
  // silently mid-publish, which is the exact failure the script exists to prevent.
  const check = path.join(dir, ".claude", "ps-check.sh");
  assert.ok(fs.existsSync(check), "install should create .claude/ps-check.sh");
  execFileSync("sh", ["-n", check]);

  for (const tpl of ["story", "task", "pr"]) {
    assert.ok(
      fs.existsSync(path.join(dir, ".squad", "templates", `${tpl}.md`)),
      `install should create .squad/templates/${tpl}.md`
    );
  }

  const statusOutput = execFileSync("node", [CLI, "status"], { cwd: dir }).toString();
  assert.ok(statusOutput.includes("managed"), "status output should contain 'managed'");

  // Orphan migration: a manifest-managed file that no longer ships (v0.1 leftovers)
  // is deleted by `update` when untouched, and no empty dirs are left behind.
  const orphan = path.join(dir, ".claude", "agents", "backend-junior.md");
  fs.mkdirSync(path.dirname(orphan), { recursive: true });
  fs.writeFileSync(orphan, "old agent\n");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  manifest.files["claude/agents/backend-junior.md"] = sha(fs.readFileSync(orphan));
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  execFileSync("node", [CLI, "update"], { cwd: dir });
  assert.ok(!fs.existsSync(orphan), "update should delete untouched orphaned files");
  assert.ok(
    !fs.existsSync(path.join(dir, ".claude", "agents")),
    "update should remove the emptied directory tree of an orphan"
  );

  // Knowledge files never get nagging .new copies: customize learnings, update again.
  fs.appendFileSync(path.join(dir, ".squad", "learnings.md"), "- [all] test rule (added 2026-07-14)\n");
  execFileSync("node", [CLI, "update"], { cwd: dir });
  assert.ok(
    !fs.existsSync(path.join(dir, ".squad", "learnings.md.new")),
    "update must not write .new for knowledge files (.squad/)"
  );

  console.log("smoke test passed");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
