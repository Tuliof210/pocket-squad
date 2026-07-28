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

  // Measured on 25 real runs: ~69% of the tokens a session generates are reasoning
  // that never reaches the transcript, and generation is the wall-clock. A command
  // with no `effort` inherits the session's, which is how a checkbox tick ends up
  // costing the same deliberation as a decomposition.
  for (const cmd of ["story", "review", "publish", "init", "load", "run", "pipe", "prune"]) {
    const file = path.join(dir, ".claude", "commands", "ps", `${cmd}.md`);
    assert.ok(fs.existsSync(file), `install should create the namespaced /ps:${cmd} command`);
    const fm = fs.readFileSync(file, "utf8").split("---")[1] || "";
    assert.match(
      fm,
      /^effort: (low|medium|high|xhigh|max)$/m,
      `/ps:${cmd} must declare an effort level, or it silently inherits the session's`
    );
    assert.match(fm, /^allowed-tools:/m, `/ps:${cmd} must declare allowed-tools`);
  }

  // The review prompts live outside the command so the main chat never retypes them
  // into a dispatch. /ps:review points at these paths — missing, the dispatch is a
  // subagent told to read a file that isn't there.
  for (const prompt of ["ps-review.md", "ps-verify.md"]) {
    assert.ok(
      fs.existsSync(path.join(dir, ".claude", prompt)),
      `install should create .claude/${prompt}`
    );
  }

  // Session-wide permissions are what let a long /ps:pipe run finish — a command's
  // `allowed-tools` grant clears on the owner's next message. Broad rules would be
  // suspended by auto mode's classifier, so every allow rule has to stay prefixed.
  const settings = JSON.parse(
    fs.readFileSync(path.join(dir, ".claude", "settings.json"), "utf8")
  );
  assert.ok(
    settings.permissions.allow.includes("Bash(gh pr merge:*)"),
    "settings.json must pre-approve the merge, or /ps:publish stalls under auto mode"
  );
  assert.ok(
    settings.permissions.deny.some((r) => r.startsWith("Bash(git push --force")),
    "settings.json must deny force push — the allow list is only defensible next to it"
  );
  for (const rule of settings.permissions.allow) {
    assert.ok(
      !/^Bash\(\*?\)$/.test(rule),
      `allow rule ${rule} is broad enough for auto mode to suspend it — keep rules prefixed`
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

  psCheckModes();
  console.log("smoke test passed");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * The ps-check.sh modes the commands hand their mechanical work to. `sh -n` above
 * only proves it parses; these prove the three modes with real logic in them do what
 * /ps:load, /ps:run and /ps:publish assume. A mode that silently does nothing looks
 * exactly like a mode that worked.
 */
function psCheckModes() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-squad-repo-"));
  const wt = path.join(os.tmpdir(), `${path.basename(repo)}--ps-wt`);
  const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: "pipe" });
  try {
    git("init", "-q", "-b", "main");
    git("config", "user.email", "smoke@example.com");
    git("config", "user.name", "smoke");
    execFileSync("node", [CLI, "install"], { cwd: repo, stdio: "pipe" });
    fs.writeFileSync(path.join(repo, "seed.txt"), "seed\n");
    git("add", "-A");
    git("commit", "-qm", "seed");

    const ps = path.join(repo, ".claude", "ps-check.sh");
    const story = path.join(repo, ".squad", "stories", "2026-01-01-demo");
    fs.mkdirSync(path.join(story, "tasks"), { recursive: true });
    fs.writeFileSync(
      path.join(story, "story.md"),
      "# Demo\n\n## Tasks\n- [x] tasks/01-ticked.md — already merged\n- [ ] tasks/02-pending.md — not yet\n"
    );
    fs.writeFileSync(path.join(story, "tasks", "01-ticked.md"), "# Ticked\n");
    fs.writeFileSync(path.join(story, "tasks", "02-pending.md"), "# Pending\n");

    // status — /ps:load reads waves off this, /ps:publish gates learnings on
    // `remaining`. No PR exists for either task, so the ticked box is the fallback.
    const status = execFileSync("sh", [ps, "status", "demo"], { cwd: repo }).toString();
    assert.match(status, /done\s+tasks\/01-ticked\.md/, "status must read a ticked box as done");
    assert.match(status, /todo\s+tasks\/02-pending\.md/, "status must read an unticked box as todo");
    assert.match(status, /remaining: 1/, "status must report what is left, or publish cannot gate on it");

    // sync — ticks only what a provider confirmed MERGED. Nothing is merged here, so
    // it must change nothing: a sync that ticks optimistically would mark a story done
    // while its PRs are still open.
    const storyMd = path.join(story, "story.md");
    const before = fs.readFileSync(storyMd, "utf8");
    execFileSync("sh", [ps, "sync", "demo"], { cwd: repo });
    assert.strictEqual(
      fs.readFileSync(storyMd, "utf8"),
      before,
      "sync must not tick a task with no merged PR"
    );
    assert.ok(!fs.existsSync(`${storyMd}.ps-tmp`), "sync must not leave its temp file behind");

    // warm — a fresh worktree with no deps is what made every task pay a full install.
    fs.mkdirSync(path.join(repo, "node_modules", "left-pad"), { recursive: true });
    fs.writeFileSync(path.join(repo, "node_modules", "left-pad", "index.js"), "module.exports=1\n");
    git("worktree", "add", "--quiet", wt, "-b", "ps/demo/pending");
    const warm = execFileSync("sh", [ps, "warm", wt], { cwd: repo }).toString();
    assert.match(warm, /node_modules ->/, "warm must link node_modules into the worktree");
    assert.ok(
      fs.existsSync(path.join(wt, "node_modules", "left-pad", "index.js")),
      "the linked node_modules must resolve from inside the worktree"
    );

    // The link points at the main checkout. Tearing the worktree down must unlink it,
    // never follow it — otherwise every sweep deletes the shared dependencies.
    git("worktree", "remove", "--force", wt);
    assert.ok(
      fs.existsSync(path.join(repo, "node_modules", "left-pad", "index.js")),
      "removing a warmed worktree must not delete the shared dependencies it linked"
    );
  } finally {
    fs.rmSync(wt, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
}
