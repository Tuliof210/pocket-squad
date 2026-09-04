#!/usr/bin/env node
/**
 * Pocket Squad — repository governance for coding agents.
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
const MANIFEST_PATH = path.join(CWD, ".agents", "pocket-squad.manifest.json");
const USAGE = "Usage: npx pocket-squad [install|update|status]";
// v4 merged Pocket Squad rules into this file while preserving user-owned settings,
// then hashed the combined result. Its hash therefore cannot prove sole ownership.
const NEVER_DELETE_OBSOLETE = new Set([path.join("agents", "settings.json")]);

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out;
}

/**
 * Map package templates to their runtime locations. `.agents/` is the portable core;
 * `.codex/` contains the Codex adapter; `.squad/` contains project governance assets.
 * Legacy `harness/` and `claude/` keys still resolve for non-destructive migration.
 */
function destFor(rel) {
  const agentsPrefix = "agents" + path.sep;
  const harnessPrefix = "harness" + path.sep;
  const legacyPrefix = "claude" + path.sep;
  const squadPrefix = "squad" + path.sep;
  const codexPrefix = "codex" + path.sep;
  if (rel.startsWith(agentsPrefix)) {
    return path.join(CWD, ".agents", rel.slice(agentsPrefix.length));
  }
  if (rel.startsWith(harnessPrefix)) {
    return path.join(CWD, ".agents", rel.slice(harnessPrefix.length));
  }
  if (rel.startsWith(legacyPrefix)) {
    return path.join(CWD, ".agents", rel.slice(legacyPrefix.length));
  }
  if (rel.startsWith(squadPrefix)) {
    return path.join(CWD, ".squad", rel.slice(squadPrefix.length));
  }
  if (rel.startsWith(codexPrefix)) {
    return path.join(CWD, ".codex", rel.slice(codexPrefix.length));
  }
  return path.join(CWD, ".squad", rel);
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

  saveManifest(hashes);
  console.log(`\nPocket Squad v${VERSION} installed.`);
  console.log(`  ${created} created, ${kept} unchanged, ${skipped} pre-existing (untouched).`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open this project in your agent harness.`);
  console.log(`  2. Run $ps-start once to create PRODUCT.md, ARCHITECTURE.md, PROTOCOLS.md and AGENTS.md.`);
  console.log(`  3. Ask for a code change normally; $ps-change can activate automatically.`);
  console.log(`  4. Run $ps-review for an independent review, or $ps-audit to check governance drift.`);
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
    // Untouched relative to what we last shipped for this dest — including a
    // template-key rename (claude/|harness/ → agents/) that kept the same on-disk path.
    const priorHash =
      oldHash ||
      Object.entries(manifest.files).find(
        ([prevRel, h]) => prevRel !== rel && destFor(prevRel) === dst && h === curHash
      )?.[1];
    if (priorHash && curHash === priorHash) {
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
  // Skip when another shipped rel still lands on the same path.
  let removed = 0;
  const shipped = new Set(rels);
  const shippedDests = new Set(rels.map((r) => destFor(r)));
  for (const [rel, oldHash] of Object.entries(manifest.files)) {
    if (shipped.has(rel)) continue;
    const dst = destFor(rel);
    if (!fs.existsSync(dst)) continue;
    if (shippedDests.has(dst)) continue;
    if (NEVER_DELETE_OBSOLETE.has(rel)) {
      console.log(`  ! obsolete     ${path.relative(CWD, dst)} (may contain user settings — kept for manual cleanup)`);
      continue;
    }
    if (sha(fs.readFileSync(dst)) === oldHash) {
      fs.unlinkSync(dst);
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
  console.error(`Unknown command: ${cmd}\n${USAGE}`);
  process.exit(1);
}
