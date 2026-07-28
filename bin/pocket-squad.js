#!/usr/bin/env node
/**
 * Pocket Squad — a lean Claude Code workflow, in your pocket.
 *
 * Usage:
 *   npx pocket-squad            # install into the current project
 *   npx pocket-squad update     # update managed files (non-destructive)
 *   npx pocket-squad status     # show managed vs customized files
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PKG_ROOT = path.resolve(__dirname, "..");
const TEMPLATES = path.join(PKG_ROOT, "templates");
const VERSION = require(path.join(PKG_ROOT, "package.json")).version;
const CWD = process.cwd();
const MANIFEST_PATH = path.join(CWD, ".claude", "pocket-squad.manifest.json");

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out;
}

/** Map a template-relative path to its destination in the target project. */
function destFor(rel) {
  if (rel.startsWith("claude" + path.sep)) {
    return path.join(CWD, ".claude", rel.slice(("claude" + path.sep).length));
  }
  return path.join(CWD, ".squad", rel.slice(("squad" + path.sep).length));
}

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveManifest(files) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify({ version: VERSION, installedAt: new Date().toISOString(), files }, null, 2)
  );
}

function install() {
  const rels = walk(TEMPLATES);
  const manifest = loadManifest();
  const hashes = {};
  let created = 0, skipped = 0, kept = 0;

  for (const rel of rels) {
    const src = path.join(TEMPLATES, rel);
    const dst = destFor(rel);
    const content = fs.readFileSync(src);
    hashes[rel] = sha(content);

    if (fs.existsSync(dst)) {
      // Never clobber an existing file on install.
      const same = sha(fs.readFileSync(dst)) === hashes[rel];
      same ? kept++ : skipped++;
      if (!same) console.log(`  ~ kept yours   ${path.relative(CWD, dst)}`);
      continue;
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, content);
    created++;
    console.log(`  + created      ${path.relative(CWD, dst)}`);
  }

  // Preserve knowledge files across reinstalls: only record hashes for files we own.
  saveManifest(hashes);
  console.log(`\nPocket Squad v${VERSION} installed.`);
  console.log(`  ${created} created, ${kept} unchanged, ${skipped} pre-existing (untouched).`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open Claude Code in this project.`);
  console.log(`  2. Run /ps:init once — proposes CLAUDE.md + .squad/PRODUCT.md + .squad/ARCHITECTURE.md, writes after you confirm.`);
  console.log(`  3. Run /ps:story "your idea" — interview only, saves a story + tasks under .squad/stories/.`);
  console.log(`  4. Run /ps:run <story-slug> — one worktree, every task in order, one PR to review.`);
  console.log(`  5. Then /ps:review (fresh-eyes review of that PR) and /ps:publish (merge + sweep + learnings).`);
  if (manifest) console.log(`\n(Previous manifest found — this was a re-install. Use "update" to upgrade managed files.)`);
}

function update() {
  const manifest = loadManifest();
  if (!manifest) {
    console.error("No manifest found. Run `npx pocket-squad` (install) first.");
    process.exit(1);
  }
  const rels = walk(TEMPLATES);
  const hashes = {};
  let updated = 0, added = 0, conflicted = 0, unchanged = 0;

  for (const rel of rels) {
    const src = path.join(TEMPLATES, rel);
    const dst = destFor(rel);
    const content = fs.readFileSync(src);
    const newHash = sha(content);
    hashes[rel] = newHash;
    const oldHash = manifest.files[rel];

    if (!fs.existsSync(dst)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, content);
      added++;
      console.log(`  + added        ${path.relative(CWD, dst)}`);
      continue;
    }
    const curHash = sha(fs.readFileSync(dst));
    if (curHash === newHash) { unchanged++; continue; }
    if (oldHash && curHash === oldHash) {
      // User never touched it — safe to upgrade in place.
      fs.writeFileSync(dst, content);
      updated++;
      console.log(`  ^ updated      ${path.relative(CWD, dst)}`);
    } else if (rel.startsWith("squad" + path.sep)) {
      // Knowledge files (.squad/) diverge by design — learnings accumulate. Never nag with .new.
      unchanged++;
      console.log(`  ~ kept         ${path.relative(CWD, dst)} (knowledge file)`);
    } else {
      // User customized it — never overwrite. Ship the new version alongside.
      fs.writeFileSync(dst + ".new", content);
      conflicted++;
      console.log(`  ! customized   ${path.relative(CWD, dst)} (new version saved as .new)`);
    }
  }

  // Files we managed that no longer ship (e.g. renamed commands): delete if untouched.
  let removed = 0;
  const shipped = new Set(rels);
  for (const [rel, oldHash] of Object.entries(manifest.files)) {
    if (shipped.has(rel)) continue;
    const dst = destFor(rel);
    if (!fs.existsSync(dst)) continue;
    if (sha(fs.readFileSync(dst)) === oldHash) {
      fs.unlinkSync(dst);
      // Climb up removing now-empty dirs (rmdir throws on non-empty — safe stop).
      for (let dir = path.dirname(dst); dir !== CWD; dir = path.dirname(dir)) {
        try { fs.rmdirSync(dir); } catch { break; }
      }
      removed++;
      console.log(`  - removed      ${path.relative(CWD, dst)} (no longer shipped)`);
    } else {
      console.log(`  ! obsolete     ${path.relative(CWD, dst)} (customized — no longer shipped, delete manually)`);
    }
  }

  saveManifest(hashes);
  console.log(`\nUpdate to v${VERSION} done: ${updated} updated, ${added} added, ${removed} removed, ${unchanged} unchanged, ${conflicted} customized (see *.new files).`);
}

function status() {
  const manifest = loadManifest();
  if (!manifest) {
    console.error("No manifest found. Run `npx pocket-squad` (install) first.");
    process.exit(1);
  }
  console.log(`Pocket Squad — installed manifest v${manifest.version}`);
  for (const [rel, hash] of Object.entries(manifest.files)) {
    const dst = destFor(rel);
    if (!fs.existsSync(dst)) { console.log(`  ✗ missing      ${path.relative(CWD, dst)}`); continue; }
    const cur = sha(fs.readFileSync(dst));
    console.log(`  ${cur === hash ? "· managed " : "★ customized"}   ${path.relative(CWD, dst)}`);
  }
}

const cmd = process.argv[2] || "install";
if (cmd === "install") install();
else if (cmd === "update") update();
else if (cmd === "status") status();
else {
  console.error(`Unknown command: ${cmd}\nUsage: npx pocket-squad [install|update|status]`);
  process.exit(1);
}
