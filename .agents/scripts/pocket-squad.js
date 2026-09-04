#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function fail(message, details) {
  process.stderr.write(`pocket-squad: ${message}\n`);
  if (details) process.stderr.write(`${details.trim()}\n`);
  process.exit(1);
}

function git(args, cwd, allowFailure = false) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) {
    fail(`git ${args.join(" ")} failed`, result.stderr || result.stdout);
  }
  return result;
}

const invocationDir = process.cwd();
const rootResult = git(["rev-parse", "--show-toplevel"], invocationDir, true);
if (rootResult.status !== 0) fail("not a git repository");
const repoRoot = rootResult.stdout.trim();

function worktrees() {
  const lines = git(["worktree", "list", "--porcelain"], repoRoot).stdout.split("\n");
  const result = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      current = { path: line.slice(9) };
      result.push(current);
    } else if (current && line.startsWith("branch refs/heads/")) {
      current.branch = line.slice(18);
    } else if (current && line.startsWith("HEAD ")) {
      current.head = line.slice(5);
    }
  }
  return result;
}

const mainRoot = worktrees()[0]?.path || repoRoot;
const commonDirRaw = git(["rev-parse", "--git-common-dir"], repoRoot).stdout.trim();
const commonDir = path.resolve(repoRoot, commonDirRaw);
const stateDir = path.join(commonDir, "pocket-squad", "runs");

function governance() {
  const required = [
    "AGENTS.md",
    path.join(".squad", "PRODUCT.md"),
    path.join(".squad", "ARCHITECTURE.md"),
    path.join(".squad", "PROTOCOLS.md"),
  ];
  const missing = required.filter((file) => !fs.existsSync(path.join(mainRoot, file)));
  if (missing.length) fail(`governance is not initialized; missing ${missing.join(", ")}. Run $ps-start.`);
  return required;
}

function validateSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "")) {
    fail("expected a lowercase kebab-case slug");
  }
  return slug;
}

function statePath(slug) {
  return path.join(stateDir, `${validateSlug(slug)}.json`);
}

function readState(slug) {
  try {
    return JSON.parse(fs.readFileSync(statePath(slug), "utf8"));
  } catch {
    fail(`no run state for ${slug}`);
  }
}

function writeState(state) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath(state.slug), `${JSON.stringify(state, null, 2)}\n`);
}

function json(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function ensureWorktreeIgnored() {
  const exclude = path.join(commonDir, "info", "exclude");
  fs.mkdirSync(path.dirname(exclude), { recursive: true });
  const pattern = ".squad/worktrees/";
  const current = fs.existsSync(exclude) ? fs.readFileSync(exclude, "utf8") : "";
  if (!current.split(/\r?\n/).includes(pattern)) {
    fs.appendFileSync(exclude, `${current && !current.endsWith("\n") ? "\n" : ""}${pattern}\n`);
  }
}

function resolveRemote(baseBranch) {
  const configured = git(["config", "--get", `branch.${baseBranch}.remote`], mainRoot, true).stdout.trim();
  const remotes = git(["remote"], mainRoot).stdout.trim().split(/\r?\n/).filter(Boolean);
  const name = configured && configured !== "."
    ? configured
    : remotes.includes("origin")
      ? "origin"
      : remotes.length === 1
        ? remotes[0]
        : undefined;
  if (!name) return {};
  const url = git(["remote", "get-url", name], mainRoot, true).stdout.trim();
  return { remote: name, remoteUrl: url || undefined };
}

function preflight() {
  const files = governance();
  const dirty = git(["status", "--porcelain", "--untracked-files=all"], mainRoot).stdout.trim();
  if (dirty) {
    json({ ok: false, repository: mainRoot, governance: files, clean: false, changes: dirty });
    fail("main checkout is not clean; commit, stash, or explicitly resolve the listed files before starting a worktree", dirty);
  }
  json({ ok: true, repository: mainRoot, governance: files, clean: true });
}

function start(slug) {
  governance();
  validateSlug(slug);
  const dirty = git(["status", "--porcelain", "--untracked-files=all"], mainRoot).stdout.trim();
  if (dirty) fail("main checkout is not clean", dirty);

  const baseBranch = git(["symbolic-ref", "--quiet", "--short", "HEAD"], mainRoot, true).stdout.trim();
  if (!baseBranch) fail("the main checkout is detached; check out the intended target branch first");
  const baseSha = git(["rev-parse", "HEAD"], mainRoot).stdout.trim();
  const branch = `task/${slug}`;
  if (git(["show-ref", "--verify", `refs/heads/${branch}`], mainRoot, true).status === 0) {
    fail(`branch ${branch} already exists; resume its recorded run or choose a different slug`);
  }

  ensureWorktreeIgnored();
  const worktree = path.join(mainRoot, ".squad", "worktrees", `${path.basename(mainRoot)}--ps`, slug);
  if (fs.existsSync(worktree)) fail(`worktree path already exists: ${worktree}`);
  fs.mkdirSync(path.dirname(worktree), { recursive: true });
  git(["worktree", "add", worktree, "-b", branch, baseSha], mainRoot);

  const state = {
    schemaVersion: 1,
    slug,
    status: "active",
    repository: mainRoot,
    worktree,
    branch,
    baseBranch,
    baseSha,
    ...resolveRemote(baseBranch),
    startedAt: new Date().toISOString(),
  };
  writeState(state);
  json(state);
}

function check(slug) {
  const state = readState(slug);
  if (!fs.existsSync(state.worktree)) fail(`recorded worktree is missing: ${state.worktree}`);
  const branch = git(["branch", "--show-current"], state.worktree).stdout.trim();
  if (branch !== state.branch) fail(`expected ${state.branch}, found ${branch || "detached HEAD"}`);
  const dirty = git(["status", "--porcelain", "--untracked-files=all"], state.worktree).stdout.trim();
  if (dirty) fail("worktree has uncommitted changes", dirty);
  const headSha = git(["rev-parse", "HEAD"], state.worktree).stdout.trim();
  const commitCount = Number(git(["rev-list", "--count", `${state.baseSha}..${headSha}`], state.worktree).stdout.trim());
  if (!commitCount) fail("the task branch has no commits beyond its recorded base");
  state.headSha = headSha;
  state.lastCheckedAt = new Date().toISOString();
  writeState(state);
  json({ ok: true, ...state, commitCount });
}

function recordReview(slug, reviewedSha, verdict) {
  if (!/^(APPROVED|FINDINGS)$/.test(verdict || "")) {
    fail("record-review verdict must be APPROVED or FINDINGS");
  }
  const state = readState(slug);
  const currentSha = git(["rev-parse", "HEAD"], state.worktree).stdout.trim();
  if (currentSha !== reviewedSha) {
    fail(`review SHA ${reviewedSha} is stale; current head is ${currentSha}`);
  }
  state.reviews = state.reviews || [];
  state.reviews.push({ verdict, reviewedSha, recordedAt: new Date().toISOString() });
  state.status = verdict === "APPROVED" ? "approved" : "active";
  writeState(state);
  json({ ok: true, slug, currentSha, verdict });
}

function status(slug) {
  if (slug) return json(readState(slug));
  if (!fs.existsSync(stateDir)) return json([]);
  const states = fs.readdirSync(stateDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(stateDir, name), "utf8")));
  json(states);
}

const [command, ...args] = process.argv.slice(2);
if (command === "preflight") preflight();
else if (command === "start") start(args[0]);
else if (command === "check") check(args[0]);
else if (command === "record-review") recordReview(args[0], args[1], args[2]);
else if (command === "status") status(args[0]);
else fail("usage: pocket-squad.js preflight | start <slug> | check <slug> | record-review <slug> <sha> <APPROVED|FINDINGS> | status [slug]");
