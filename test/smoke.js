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
  for (const cmd of ["story", "review", "publish", "init", "run", "prune"]) {
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

  // Subagents are where most of a story's tokens are generated, and a command's own
  // frontmatter never reaches one. The agent definition is the only place their model
  // and effort can be pinned, so a missing file means the step silently runs at the
  // session's level — which is the failure this whole file exists to make loud.
  for (const [agent, expect] of [
    ["ps-review", /^effort: high$/m],
    ["ps-verify", /^effort: low$/m],
  ]) {
    const file = path.join(dir, ".claude", "agents", `${agent}.md`);
    assert.ok(fs.existsSync(file), `install should create the ${agent} subagent`);
    const fm = fs.readFileSync(file, "utf8").split("---")[1] || "";
    assert.match(fm, expect, `${agent} must pin its effort, or it inherits the session's`);
    assert.match(fm, /^model: /m, `${agent} must state its model, even when it inherits`);
    assert.match(fm, new RegExp(`^name: ${agent}$`, "m"), `${agent}'s name must match its dispatch`);
  }
  assert.ok(
    !/Write|Edit/.test(fs.readFileSync(path.join(dir, ".claude", "agents", "ps-review.md"), "utf8")
      .split("---")[1].match(/^tools: .*/m)[0]),
    "ps-review must not get write tools — a reviewer that fixes what it finds stops reporting it"
  );

  // Everything a past version shipped and v2.0 does not. /ps:load and /ps:pipe died
  // when execution moved into the main chat, and ps-task with them — there are no
  // execution subagents left, only review ones.
  for (const gone of [
    path.join(".claude", "commands", "ps", "load.md"),
    path.join(".claude", "commands", "ps", "pipe.md"),
    path.join(".claude", "agents", "ps-task.md"),
    path.join(".claude", "agents", "backend-junior.md"),
    path.join(".claude", "agents", "techlead.md"),
    path.join(".claude", "skills"),
    path.join(".claude", "techlead.md"),
    path.join(".claude", "commands", "ps", "status.md"),
    path.join(".squad", "project-context.md"),
  ]) {
    assert.ok(!fs.existsSync(path.join(dir, gone)), `${gone} must not ship`);
  }

  // The window machinery went with the topology: only whole stories reach the target
  // branch now, so an intermediate state cannot be a regression there.
  for (const f of [
    path.join(dir, ".squad", "templates", "task.md"),
    path.join(dir, ".claude", "ps-check.sh"),
    path.join(dir, ".claude", "commands", "ps", "publish.md"),
  ]) {
    assert.ok(
      !/window:/i.test(fs.readFileSync(f, "utf8")),
      `${path.basename(f)} still mentions the removed degradation-window field`
    );
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
  // Two orphans on purpose: one whose directory still holds shipped files (v1.0 put
  // ps-* agents back into .claude/agents/, so that directory must survive), and one
  // whose directory empties out and must be climbed away.
  const orphan = path.join(dir, ".claude", "agents", "backend-junior.md");
  const deepOrphan = path.join(dir, ".claude", "skills", "ps-backend-api", "SKILL.md");
  for (const [p, body] of [[orphan, "old agent\n"], [deepOrphan, "old skill\n"]]) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  manifest.files["claude/agents/backend-junior.md"] = sha(fs.readFileSync(orphan));
  manifest.files["claude/skills/ps-backend-api/SKILL.md"] = sha(fs.readFileSync(deepOrphan));
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  execFileSync("node", [CLI, "update"], { cwd: dir });
  assert.ok(!fs.existsSync(orphan), "update should delete untouched orphaned files");
  assert.ok(
    !fs.existsSync(path.join(dir, ".claude", "skills")),
    "update should remove the emptied directory tree of an orphan"
  );
  assert.ok(
    fs.existsSync(path.join(dir, ".claude", "agents", "ps-review.md")),
    "removing an orphan must not take the shipped files sharing its directory"
  );

  // Knowledge files never get nagging .new copies: customize learnings, update again.
  fs.appendFileSync(path.join(dir, ".squad", "learnings.md"), "- [all] test rule (added 2026-07-14)\n");
  execFileSync("node", [CLI, "update"], { cwd: dir });
  assert.ok(
    !fs.existsSync(path.join(dir, ".squad", "learnings.md.new")),
    "update must not write .new for knowledge files (.squad/)"
  );

  psCheckModes();
  settingsMerge();
  console.log("smoke test passed");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Most projects already have a `.claude/settings.json`. Skipping it there — which is what
 * "never clobber" meant for every other file — shipped the workflow with none of its
 * permissions, so a long `/ps:run` stalled on a prompt in exactly the projects that
 * already used Claude Code. settings.json is the one merged file: ours are added, theirs
 * are kept, nothing is ever dropped, and running twice adds nothing the second time.
 */
function settingsMerge() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-squad-settings-"));
  const file = path.join(dir, ".claude", "settings.json");
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({
        model: "opusplan",
        permissions: { allow: ["Bash(terraform plan:*)"], deny: ["Bash(rm -rf:*)"] },
      })
    );
    execFileSync("node", [CLI, "install"], { cwd: dir });

    const merged = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.strictEqual(merged.model, "opusplan", "merging permissions must not drop other settings keys");
    assert.ok(
      merged.permissions.allow.includes("Bash(terraform plan:*)") &&
        merged.permissions.deny.includes("Bash(rm -rf:*)"),
      "merging must keep every rule the project already had"
    );
    assert.ok(
      merged.permissions.allow.includes("Bash(gh pr merge:*)") &&
        merged.permissions.deny.includes("Bash(git push --force:*)"),
      "install must add our rules to a pre-existing settings.json, not skip the file"
    );

    // Idempotent, and `update` merges too — a rule count that grows every run would
    // mean duplicates piling up in the file forever.
    const before = merged.permissions.allow.length;
    execFileSync("node", [CLI, "install"], { cwd: dir });
    execFileSync("node", [CLI, "update"], { cwd: dir });
    const after = JSON.parse(fs.readFileSync(file, "utf8")).permissions.allow.length;
    assert.strictEqual(after, before, "re-running must not duplicate permission rules");
    assert.ok(!fs.existsSync(file + ".new"), "a merged settings.json must never leave a .new to hand-merge");

    // Malformed JSON must not be overwritten — losing a project's settings to a stray
    // trailing comma is the one outcome worse than a permission prompt.
    fs.writeFileSync(file, "{ oops");
    execFileSync("node", [CLI, "update"], { cwd: dir });
    assert.strictEqual(fs.readFileSync(file, "utf8"), "{ oops", "unparseable settings must be left alone");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The ps-check.sh modes the commands hand their mechanical work to. `sh -n` above
 * only proves it parses; these prove the three modes with real logic in them do what
 * /ps:run and /ps:publish assume. A mode that silently does nothing looks
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

    // status — /ps:run skips what this calls done and /ps:publish gates learnings on
    // `remaining`. With no story branch yet it reads the boxes in this checkout.
    const status = execFileSync("sh", [ps, "status", "demo"], { cwd: repo }).toString();
    assert.match(status, /done\s+tasks\/01-ticked\.md/, "status must read a ticked box as done");
    assert.match(status, /todo\s+tasks\/02-pending\.md/, "status must read an unticked box as todo");
    assert.match(status, /remaining: 1/, "status must report what is left, or publish cannot gate on it");

    // A story in flight has its ticks on the story branch and nowhere else — they
    // reach this checkout only when the story PR merges. Reading story.md from here
    // would call a finished task todo, and /ps:run would do it a second time.
    const storyMd = path.join(story, "story.md");
    const before = fs.readFileSync(storyMd, "utf8");
    git("add", "-A");
    git("commit", "-qm", "story");
    git("switch", "-q", "-c", "ps-story/2026-01-01-demo");
    fs.writeFileSync(storyMd, before.replace("- [ ] tasks/02", "- [x] tasks/02"));
    git("commit", "-qam", "02 done");
    git("switch", "-q", "main");
    const inFlight = execFileSync("sh", [ps, "status", "demo"], { cwd: repo }).toString();
    assert.match(
      inFlight,
      /done\s+tasks\/02-pending\.md/,
      "status must read the ticks off the story branch, not this checkout"
    );
    assert.match(inFlight, /remaining: 0/, "a story whose branch ticks every box has nothing left");

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
