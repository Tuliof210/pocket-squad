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
  for (const cmd of ["sync", "task", "run", "review", "publish"]) {
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

  // The review prompt lives outside the command so the main chat never retypes it into
  // a dispatch. /ps:review points at this path — missing, the dispatch is a subagent
  // told to read a file that isn't there.
  assert.ok(
    fs.existsSync(path.join(dir, ".claude", "ps-review.md")),
    "install should create .claude/ps-review.md"
  );

  // Same reason, one step later: the three commands that talk to the owner end by
  // following a single report shape instead of each inventing one. A pointer to a file
  // that did not ship is a command that falls back to freeform prose — which is the
  // failure the shared shape exists to end.
  const report = path.join(dir, ".claude", "ps-report.md");
  assert.ok(fs.existsSync(report), "install should create .claude/ps-report.md");
  for (const cmd of ["task", "run", "review"]) {
    const body = fs.readFileSync(path.join(dir, ".claude", "commands", "ps", `${cmd}.md`), "utf8");
    assert.match(body, /ps-report\.md/, `/ps:${cmd} must point at the shared report shape`);
  }

  // Session-wide permissions are what let a long /ps:run finish — a command's
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

  // Subagents are where most of a task's tokens are generated, and a command's own
  // frontmatter never reaches one. The agent definition is the only place their model
  // and effort can be pinned, so a missing file means the step silently runs at the
  // session's level — which is the failure this whole file exists to make loud.
  const agent = path.join(dir, ".claude", "agents", "ps-review.md");
  assert.ok(fs.existsSync(agent), "install should create the ps-review subagent");
  const agentFm = fs.readFileSync(agent, "utf8").split("---")[1] || "";
  assert.match(agentFm, /^effort: high$/m, "ps-review must pin its effort, or it inherits the session's");
  assert.match(agentFm, /^model: /m, "ps-review must state its model, even when it inherits");
  assert.match(agentFm, /^name: ps-review$/m, "ps-review's name must match its dispatch");
  assert.ok(
    !/Write|Edit/.test(agentFm.match(/^tools: .*/m)[0]),
    "ps-review must not get write tools — a reviewer that fixes what it finds stops reporting it"
  );

  // Everything a past version shipped and v4.0 does not. /ps:story and /ps:init were
  // renamed to /ps:task and /ps:sync; learnings, debt and /ps:prune died because a rule
  // read alongside CLAUDE.md and ARCHITECTURE.md was noise, and a debt ledger was a
  // place to defer the fix to; the verification round died with the second round.
  for (const gone of [
    path.join(".claude", "commands", "ps", "init.md"),
    path.join(".claude", "commands", "ps", "story.md"),
    path.join(".claude", "commands", "ps", "prune.md"),
    path.join(".claude", "commands", "ps", "load.md"),
    path.join(".claude", "commands", "ps", "pipe.md"),
    path.join(".claude", "commands", "ps", "status.md"),
    path.join(".claude", "agents", "ps-verify.md"),
    path.join(".claude", "agents", "ps-task.md"),
    path.join(".claude", "agents", "backend-junior.md"),
    path.join(".claude", "agents", "techlead.md"),
    path.join(".claude", "ps-verify.md"),
    path.join(".claude", "techlead.md"),
    path.join(".claude", "skills"),
    path.join(".squad", "learnings.md"),
    path.join(".squad", "debt.md"),
    path.join(".squad", "templates", "story.md"),
    path.join(".squad", "templates", "task.md"),
    path.join(".squad", "project-context.md"),
  ]) {
    assert.ok(!fs.existsSync(path.join(dir, gone)), `${gone} must not ship`);
  }

  // Learnings and debt are gone from the prose too, not just from disk: a command that
  // still tells the model to append to .squad/learnings.md sends it to write a file
  // nothing ships and nothing reads.
  for (const f of walk(path.join(dir, ".claude")).concat(walk(path.join(dir, ".squad")))) {
    if (!f.endsWith(".md") && !f.endsWith(".sh")) continue;
    const body = fs.readFileSync(f, "utf8");
    assert.ok(!/learnings\.md|debt\.md/.test(body), `${path.basename(f)} still references learnings/debt`);
    assert.ok(!/ps:story|ps:init|ps:prune/.test(body), `${path.basename(f)} still references a renamed command`);
  }

  // The mechanical checks the commands delegate to. A syntax error here would fail
  // silently mid-publish, which is the exact failure the script exists to prevent.
  const check = path.join(dir, ".claude", "ps-check.sh");
  assert.ok(fs.existsSync(check), "install should create .claude/ps-check.sh");
  execFileSync("sh", ["-n", check]);

  for (const tpl of ["prompt", "pr"]) {
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

  // A v3 project updating to v4: its learnings file was edited (it held real rules), so
  // it is no longer identical to what v3 shipped. It must survive the update — deleting
  // a file the owner wrote is the one thing this CLI may never do — and be reported.
  const stale = path.join(dir, ".squad", "learnings.md");
  fs.writeFileSync(stale, "- [all] a real rule someone wrote\n");
  const m2 = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  m2.files["squad/learnings.md"] = sha(Buffer.from("what v3 shipped\n"));
  fs.writeFileSync(MANIFEST, JSON.stringify(m2, null, 2));
  const out = execFileSync("node", [CLI, "update"], { cwd: dir }).toString();
  assert.ok(fs.existsSync(stale), "update must never delete a knowledge file the owner edited");
  assert.match(out, /obsolete\s+\.squad\/learnings\.md/, "an edited orphan must be reported, not silently kept");
  fs.rmSync(stale);

  psCheckModes();
  settingsMerge();
  console.log("smoke test passed");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

function walk(root, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, e.name);
    e.isDirectory() ? walk(full, out) : out.push(full);
  }
  return out;
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
 * The ps-check.sh modes the commands hand their mechanical work to. `sh -n` above only
 * proves it parses; these prove the modes with real logic in them do what /ps:run and
 * /ps:publish assume. A mode that silently does nothing looks exactly like one that
 * worked.
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

    // An unknown mode must fail loudly. `report`/`status` were real modes up to v3 and
    // a stale command still calling them would otherwise look like it swept clean.
    assert.throws(
      () => execFileSync("sh", [ps, "status", "demo"], { cwd: repo, stdio: "pipe" }),
      "an unknown mode must exit non-zero, not silently do nothing"
    );

    // publish refuses before it touches anything when the checkout is dirty — the
    // failure it prevents is a merge that lands and then a checkout that cannot move.
    fs.appendFileSync(path.join(repo, "seed.txt"), "dirty\n");
    let dirty = "";
    try {
      execFileSync("sh", [ps, "publish", "1"], { cwd: repo, stdio: "pipe" });
      assert.fail("publish must refuse a dirty checkout");
    } catch (e) {
      dirty = (e.stdout || Buffer.alloc(0)).toString();
    }
    assert.match(dirty, /ABORT|needs the gh CLI/, "publish must abort, and say why, before merging anything");
    git("checkout", "--", "seed.txt");

    // warm — a fresh worktree with no deps is what made every task pay a full install.
    fs.mkdirSync(path.join(repo, "node_modules", "left-pad"), { recursive: true });
    fs.writeFileSync(path.join(repo, "node_modules", "left-pad", "index.js"), "module.exports=1\n");
    git("worktree", "add", "--quiet", wt, "-b", "task/demo");
    const warm = execFileSync("sh", [ps, "warm", wt], { cwd: repo }).toString();
    assert.match(warm, /node_modules ->/, "warm must link node_modules into the worktree");
    assert.ok(
      fs.existsSync(path.join(wt, "node_modules", "left-pad", "index.js")),
      "the linked node_modules must resolve from inside the worktree"
    );

    // sweep with no provider must remove nothing and say so — silence would read as
    // "swept clean" and the branch would look gone when it is not.
    const sweep = execFileSync("sh", [ps, "sweep"], { cwd: repo, env: { ...process.env, PATH: "/usr/bin:/bin" } })
      .toString();
    assert.match(sweep, /SUMMARY/, "sweep must always end with a SUMMARY line");
    assert.ok(fs.existsSync(wt), "sweep must not remove a worktree whose PR state it cannot read");

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
