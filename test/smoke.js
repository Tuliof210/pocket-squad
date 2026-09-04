#!/usr/bin/env node
"use strict";

const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const CLI = path.join(ROOT, "bin", "pocket-squad.js");
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

function run(command, args, cwd, options = {}) {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe", ...options });
}

function walk(root, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    entry.isDirectory() ? walk(full, out) : out.push(full);
  }
  return out;
}

function writeGovernance(repo) {
  fs.writeFileSync(path.join(repo, "AGENTS.md"), "Read .squad/PRODUCT.md, ARCHITECTURE.md and PROTOCOLS.md.\n");
  for (const name of ["PRODUCT", "ARCHITECTURE", "PROTOCOLS"]) {
    fs.writeFileSync(path.join(repo, ".squad", `${name}.md`), `# ${name}\n\nInitialized for test.\n`);
  }
}

function installContract() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-squad-install-"));
  try {
    run("node", [CLI, "install"], repo);

    const skills = ["start", "change", "review", "audit", "teach"];
    for (const name of skills) {
      const skill = path.join(repo, ".agents", "skills", `ps-${name}`, "SKILL.md");
      const ui = path.join(repo, ".agents", "skills", `ps-${name}`, "agents", "openai.yaml");
      assert.ok(fs.existsSync(skill), `ps-${name} must be installed`);
      assert.ok(fs.existsSync(ui), `ps-${name} must include invocation metadata`);
      const frontmatter = fs.readFileSync(skill, "utf8").split("---")[1] || "";
      assert.match(frontmatter, new RegExp(`^name: ps-${name}$`, "m"));
      assert.match(frontmatter, /^description: .+/m);
      assert.doesNotMatch(frontmatter, /^(allowed-tools|effort|tools|model):/m,
        "portable skills must not claim unsupported runtime policy in frontmatter");
      assert.match(fs.readFileSync(ui, "utf8"), /allow_implicit_invocation: true/);
    }

    for (const legacy of ["ps-sync", "ps-task", "ps-run"]) {
      assert.ok(!fs.existsSync(path.join(repo, ".agents", "skills", legacy)), `${legacy} must not ship in v5`);
    }

    for (const template of ["agents", "product", "architecture", "protocols", "prompt", "pr", "verdict"]) {
      assert.ok(fs.existsSync(path.join(repo, ".squad", "templates", `${template}.md`)), `${template} template missing`);
    }

    const protocolTemplate = fs.readFileSync(path.join(repo, ".squad", "templates", "protocols.md"), "utf8");
    for (const id of ["P001", "P002", "P003", "P004", "P005", "P006", "P007", "P008", "P009"]) {
      assert.match(protocolTemplate, new RegExp(`## ${id}\\b`), `${id} must have a canonical definition`);
    }

    const codexConfig = fs.readFileSync(path.join(repo, ".codex", "config.toml"), "utf8");
    for (const agent of ["review_reader", "review_runner", "fix_verifier"]) {
      assert.match(codexConfig, new RegExp(`\\[agents\\.${agent}\\]`));
    }
    assert.match(fs.readFileSync(path.join(repo, ".codex", "agents", "review-reader.toml"), "utf8"),
      /sandbox_mode = "read-only"/);
    for (const reviewer of ["read", "run", "verify-fix"]) {
      assert.ok(fs.existsSync(path.join(repo, ".agents", "reviewers", `${reviewer}.md`)),
        `portable reviewer contract ${reviewer} must be installed`);
    }

    const installed = walk(path.join(repo, ".agents")).concat(walk(path.join(repo, ".squad")));
    for (const file of installed.filter((item) => /\.(md|json|js|yaml)$/.test(item))) {
      const body = fs.readFileSync(file, "utf8");
      assert.ok(!body.includes(".claude/"), `${path.relative(repo, file)} contains a harness-specific legacy path`);
    }

    const status = run("node", [CLI, "status"], repo);
    assert.match(status, /installed manifest v5\.0\.0/);
    assert.match(status, /managed/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function workflowContract() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pocket squad flow-"));
  try {
    run("git", ["init", "-q", "-b", "main"], repo);
    run("git", ["config", "user.email", "smoke@example.com"], repo);
    run("git", ["config", "user.name", "Pocket Squad Smoke"], repo);
    run("node", [CLI, "install"], repo);
    writeGovernance(repo);
    run("git", ["add", "-A"], repo);
    run("git", ["commit", "-qm", "chore: initialize governed fixture"], repo);

    const helper = path.join(repo, ".agents", "scripts", "pocket-squad.js");
    const preflight = JSON.parse(run("node", [helper, "preflight"], repo));
    assert.strictEqual(preflight.ok, true);
    assert.strictEqual(preflight.clean, true);

    fs.writeFileSync(path.join(repo, "uncommitted.txt"), "do not absorb me\n");
    const dirtyPreflight = spawnSync("node", [helper, "preflight"], { cwd: repo, encoding: "utf8" });
    assert.notStrictEqual(dirtyPreflight.status, 0, "preflight must stop before hiding user changes in a new worktree");
    assert.match(dirtyPreflight.stderr, /main checkout is not clean/);
    assert.strictEqual(JSON.parse(dirtyPreflight.stdout).ok, false);
    fs.unlinkSync(path.join(repo, "uncommitted.txt"));

    const traversal = spawnSync("node", [helper, "status", "../outside"], { cwd: repo, encoding: "utf8" });
    assert.notStrictEqual(traversal.status, 0, "run state lookups must reject path traversal");
    assert.match(traversal.stderr, /lowercase kebab-case slug/);

    const state = JSON.parse(run("node", [helper, "start", "demo-change"], repo));
    assert.strictEqual(state.branch, "task/demo-change");
    assert.strictEqual(state.baseBranch, "main");
    assert.ok(fs.existsSync(state.worktree), "start must create the exact returned worktree");
    assert.strictEqual(run("git", ["status", "--porcelain", "--untracked-files=all"], repo), "",
      "the nested worktree must be excluded from the main checkout");

    fs.writeFileSync(path.join(state.worktree, "result.txt"), "implemented\n");
    run("git", ["add", "result.txt"], state.worktree);
    run("git", ["commit", "-qm", "feat(demo): add result"], state.worktree);

    const checked = JSON.parse(run("node", [helper, "check", "demo-change"], repo));
    assert.strictEqual(checked.ok, true);
    assert.strictEqual(checked.commitCount, 1);
    assert.strictEqual(checked.headSha, run("git", ["rev-parse", "HEAD"], state.worktree).trim());

    const stale = spawnSync("node", [helper, "record-review", "demo-change", state.baseSha, "APPROVED"],
      { cwd: repo, encoding: "utf8" });
    assert.notStrictEqual(stale.status, 0, "a stale review SHA must be rejected");
    assert.match(stale.stderr, /is stale/);

    const recorded = JSON.parse(run("node", [helper, "record-review", "demo-change", checked.headSha, "APPROVED"], repo));
    assert.strictEqual(recorded.verdict, "APPROVED");
    const finalState = JSON.parse(run("node", [helper, "status", "demo-change"], repo));
    assert.strictEqual(finalState.status, "approved");
    assert.strictEqual(finalState.reviews.at(-1).reviewedSha, checked.headSha);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function updateContract() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-squad-update-"));
  try {
    run("node", [CLI, "install"], repo);
    const manifestPath = path.join(repo, ".agents", "pocket-squad.manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const obsolete = path.join(repo, ".agents", "settings.json");
    const oldBody = "{\"legacy\":true}\n";
    fs.writeFileSync(obsolete, oldBody);
    manifest.files["agents/settings.json"] = sha(oldBody);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const migrated = run("node", [CLI, "update"], repo);
    assert.ok(fs.existsSync(obsolete), "mixed-ownership v4 settings must be preserved");
    assert.match(migrated, /obsolete\s+\.agents\/settings\.json.*user settings/);

    const skill = path.join(repo, ".agents", "skills", "ps-change", "SKILL.md");
    fs.appendFileSync(skill, "\nLocal customization.\n");
    const updated = run("node", [CLI, "update"], repo);
    assert.match(updated, /customized\s+\.agents\/skills\/ps-change\/SKILL\.md/);
    assert.ok(fs.existsSync(`${skill}.new`), "updates must preserve customized skills and write the new version beside them");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

installContract();
workflowContract();
updateContract();
console.log("smoke test passed");
