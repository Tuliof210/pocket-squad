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

const SETTINGS_REL = path.join("claude", "settings.json");

/**
 * The one file that has to land in EVERY project, pre-existing settings or not: without
 * its allow rules a long `/ps:run` stalls on a permission prompt halfway through. So it
 * is merged instead of skipped — our permission lists are unioned into whatever is
 * already there, every other key the project set is left untouched, and nothing is ever
 * removed. Returns the hash of the file on disk afterwards, for the manifest.
 */
function mergeSettings() {
  const dst = destFor(SETTINGS_REL);
  const label = path.relative(CWD, dst);
  const raw = fs.readFileSync(path.join(TEMPLATES, SETTINGS_REL));

  if (!fs.existsSync(dst)) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, raw);
    console.log(`  + created      ${label}`);
    return sha(raw);
  }

  const cur = fs.readFileSync(dst);
  let settings;
  try {
    settings = JSON.parse(cur);
  } catch {
    console.log(`  ! unreadable   ${label} (not valid JSON — permissions NOT merged, fix it by hand)`);
    return sha(cur);
  }

  const perms = (settings.permissions = settings.permissions || {});
  let added = 0;
  for (const [list, rules] of Object.entries(JSON.parse(raw).permissions)) {
    const have = Array.isArray(perms[list]) ? perms[list] : [];
    const missing = rules.filter((r) => !have.includes(r));
    added += missing.length;
    perms[list] = [...have, ...missing];
  }
  if (!added) {
    console.log(`  · managed      ${label} (permissions already present)`);
    return sha(cur);
  }

  const out = Buffer.from(JSON.stringify(settings, null, 2) + "\n");
  fs.writeFileSync(dst, out);
  console.log(`  ^ merged       ${label} (${added} permission rule${added === 1 ? "" : "s"} added, yours kept)`);
  return sha(out);
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
    if (rel === SETTINGS_REL) { hashes[rel] = mergeSettings(); continue; }
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

  saveManifest(hashes);
  console.log(`\nPocket Squad v${VERSION} installed.`);
  console.log(`  ${created} created, ${kept} unchanged, ${skipped} pre-existing (untouched).`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open Claude Code in this project.`);
  console.log(`  2. Run /ps:sync once — moves product/architecture rules into .squad/PRODUCT.md + .squad/ARCHITECTURE.md, writes after you confirm.`);
  console.log(`  3. Run /ps:task "your request" — refines it into .squad/tasks/<yymmdd-hhmm>.prompt.md.`);
  console.log(`  4. Run /ps:run <id> — worktree on task/<slug>, one commit per step, one PR.`);
  console.log(`  5. Then /ps:review (fresh eyes, one round) and /ps:publish (merge + cleanup).`);
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
    if (rel === SETTINGS_REL) { hashes[rel] = mergeSettings(); continue; }
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
