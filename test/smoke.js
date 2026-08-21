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

  const MANIFEST = path.join(dir, ".agents", "pocket-squad.manifest.json");
  assert.ok(fs.existsSync(MANIFEST), "install should create .agents/pocket-squad.manifest.json");

  for (const cmd of ["sync", "task", "run", "review", "teach"]) {
    const file = path.join(dir, ".agents", "commands", `ps-${cmd}.md`);
    assert.ok(fs.existsSync(file), `install should create the /ps-${cmd} command`);
    const fm = fs.readFileSync(file, "utf8").split("---")[1] || "";
    assert.match(
      fm,
      /^effort: (low|medium|high|xhigh|max)$/m,
      `/ps-${cmd} must declare an effort level, or it silently inherits the session's`
    );
    assert.match(fm, /^allowed-tools:/m, `/ps-${cmd} must declare allowed-tools`);
  }
  assert.ok(
    !fs.existsSync(path.join(dir, ".agents", "commands", "ps-publish.md")),
    "ps-publish must not ship"
  );
  assert.ok(
    !fs.existsSync(path.join(dir, ".agents", "commands", "ps")),
    "commands must be flat under commands/, not namespaced under commands/ps/"
  );

  assert.ok(
    fs.existsSync(path.join(dir, ".agents", "ps-review.md")),
    "install should create .agents/ps-review.md"
  );

  const report = path.join(dir, ".agents", "ps-report.md");
  assert.ok(fs.existsSync(report), "install should create .agents/ps-report.md");
  for (const cmd of ["task", "run", "review"]) {
    const body = fs.readFileSync(path.join(dir, ".agents", "commands", `ps-${cmd}.md`), "utf8");
    assert.match(body, /ps-report\.md/, `/ps-${cmd} must point at the shared report shape`);
    assert.ok(!body.includes(".claude/"), `${cmd} must not reference .claude/ paths`);
  }

  const settings = JSON.parse(
    fs.readFileSync(path.join(dir, ".agents", "settings.json"), "utf8")
  );
  assert.ok(
    settings.permissions.allow.includes("Bash(sh .agents/ps-check.sh:*)"),
    "settings.json must pre-approve ps-check.sh, or /ps-run stalls under auto mode"
  );
  assert.ok(
    !settings.permissions.allow.includes("Bash(gh pr merge:*)"),
    "gh pr merge must not be pre-approved — publish is no longer a slash command"
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

  const agent = path.join(dir, ".agents", "agents", "ps-review.md");
  assert.ok(fs.existsSync(agent), "install should create the ps-review subagent");
  const agentFm = fs.readFileSync(agent, "utf8").split("---")[1] || "";
  assert.match(agentFm, /^effort: high$/m, "ps-review must pin its effort, or it inherits the session's");
  assert.match(agentFm, /^model: /m, "ps-review must state its model, even when it inherits");
  assert.match(agentFm, /^name: ps-review$/m, "ps-review's name must match its dispatch");
  assert.ok(
    !/Write|Edit/.test(agentFm.match(/^tools: .*/m)[0]),
    "ps-review must not get write tools — a reviewer that fixes what it finds stops reporting it"
  );

  for (const gone of [
    path.join(".agents", "commands", "ps", "init.md"),
    path.join(".agents", "commands", "ps", "story.md"),
    path.join(".agents", "commands", "ps", "prune.md"),
    path.join(".agents", "commands", "ps", "load.md"),
    path.join(".agents", "commands", "ps", "pipe.md"),
    path.join(".agents", "commands", "ps", "status.md"),
    path.join(".agents", "commands", "ps", "publish.md"),
    path.join(".agents", "commands", "ps-publish.md"),
    path.join(".agents", "agents", "ps-verify.md"),
    path.join(".agents", "agents", "ps-task.md"),
    path.join(".agents", "agents", "backend-junior.md"),
    path.join(".agents", "agents", "techlead.md"),
    path.join(".agents", "ps-verify.md"),
    path.join(".agents", "techlead.md"),
    path.join(".agents", "skills"),
    path.join(".squad", "learnings.md"),
    path.join(".squad", "debt.md"),
    path.join(".squad", "templates", "story.md"),
    path.join(".squad", "templates", "task.md"),
    path.join(".squad", "project-context.md"),
  ]) {
    assert.ok(!fs.existsSync(path.join(dir, gone)), `${gone} must not ship`);
  }

  for (const f of walk(path.join(dir, ".agents")).concat(walk(path.join(dir, ".squad")))) {
    if (!f.endsWith(".md") && !f.endsWith(".sh") && !f.endsWith(".json")) continue;
    const body = fs.readFileSync(f, "utf8");
    assert.ok(!/learnings\.md|debt\.md/.test(body), `${path.basename(f)} still references learnings/debt`);
    assert.ok(!/ps:story|ps:init|ps:prune|\/ps:publish/.test(body), `${path.basename(f)} still references a removed command`);
    assert.ok(!body.includes(".claude/"), `${path.relative(dir, f)} still references .claude/`);
  }

  const check = path.join(dir, ".agents", "ps-check.sh");
  assert.ok(fs.existsSync(check), "install should create .agents/ps-check.sh");
  execFileSync("sh", ["-n", check]);

  for (const tpl of ["prompt", "pr"]) {
    assert.ok(
      fs.existsSync(path.join(dir, ".squad", "templates", `${tpl}.md`)),
      `install should create .squad/templates/${tpl}.md`
    );
  }

  const statusOutput = execFileSync("node", [CLI, "status"], { cwd: dir }).toString();
  assert.ok(statusOutput.includes("managed"), "status output should contain 'managed'");

  // Orphan migration
  const orphan = path.join(dir, ".agents", "agents", "backend-junior.md");
  const deepOrphan = path.join(dir, ".agents", "skills", "ps-backend-api", "SKILL.md");
  for (const [p, body] of [[orphan, "old agent\n"], [deepOrphan, "old skill\n"]]) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  manifest.files["agents/agents/backend-junior.md"] = sha(fs.readFileSync(orphan));
  manifest.files["agents/skills/ps-backend-api/SKILL.md"] = sha(fs.readFileSync(deepOrphan));
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  execFileSync("node", [CLI, "update"], { cwd: dir });
  assert.ok(!fs.existsSync(orphan), "update should delete untouched orphaned files");
  assert.ok(
    !fs.existsSync(path.join(dir, ".agents", "skills")),
    "update should remove the emptied directory tree of an orphan"
  );
  assert.ok(
    fs.existsSync(path.join(dir, ".agents", "agents", "ps-review.md")),
    "removing an orphan must not take the shipped files sharing its directory"
  );

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

function settingsMerge() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-squad-settings-"));
  const file = path.join(dir, ".agents", "settings.json");
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
      merged.permissions.allow.includes("Bash(sh .agents/ps-check.sh:*)") &&
        merged.permissions.deny.includes("Bash(git push --force:*)"),
      "install must add our rules to a pre-existing settings.json, not skip the file"
    );

    const before = merged.permissions.allow.length;
    execFileSync("node", [CLI, "install"], { cwd: dir });
    execFileSync("node", [CLI, "update"], { cwd: dir });
    const after = JSON.parse(fs.readFileSync(file, "utf8")).permissions.allow.length;
    assert.strictEqual(after, before, "re-running must not duplicate permission rules");
    assert.ok(!fs.existsSync(file + ".new"), "a merged settings.json must never leave a .new to hand-merge");

    fs.writeFileSync(file, "{ oops");
    execFileSync("node", [CLI, "update"], { cwd: dir });
    assert.strictEqual(fs.readFileSync(file, "utf8"), "{ oops", "unparseable settings must be left alone");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

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

    const ps = path.join(repo, ".agents", "ps-check.sh");

    assert.throws(
      () => execFileSync("sh", [ps, "status", "demo"], { cwd: repo, stdio: "pipe" }),
      "an unknown mode must exit non-zero, not silently do nothing"
    );

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

    fs.mkdirSync(path.join(repo, "node_modules", "left-pad"), { recursive: true });
    fs.writeFileSync(path.join(repo, "node_modules", "left-pad", "index.js"), "module.exports=1\n");
    git("worktree", "add", "--quiet", wt, "-b", "task/demo");
    const warm = execFileSync("sh", [ps, "warm", wt], { cwd: repo }).toString();
    assert.match(warm, /node_modules ->/, "warm must link node_modules into the worktree");
    assert.ok(
      fs.existsSync(path.join(wt, "node_modules", "left-pad", "index.js")),
      "the linked node_modules must resolve from inside the worktree"
    );

    const sweep = execFileSync("sh", [ps, "sweep"], { cwd: repo, env: { ...process.env, PATH: "/usr/bin:/bin" } })
      .toString();
    assert.match(sweep, /SUMMARY/, "sweep must always end with a SUMMARY line");
    assert.ok(fs.existsSync(wt), "sweep must not remove a worktree whose PR state it cannot read");

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
