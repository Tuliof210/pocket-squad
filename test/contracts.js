#!/usr/bin/env node
"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "evals", "cases.json"), "utf8"));
const protocol = fs.readFileSync(path.join(root, "templates", "squad", "templates", "protocols.md"), "utf8");
const skills = new Set(fs.readdirSync(path.join(root, "templates", "agents", "skills"))
  .filter((name) => fs.existsSync(path.join(root, "templates", "agents", "skills", name, "SKILL.md"))));
const agents = new Set(["review_reader", "review_runner", "fix_verifier"]);

assert.ok(cases.length >= 5, "keep a representative routing and protocol evaluation corpus");
assert.strictEqual(new Set(cases.map((item) => item.id)).size, cases.length, "evaluation ids must be unique");

for (const item of cases) {
  assert.ok(skills.has(item.expectedSkill), `${item.id} routes to missing skill ${item.expectedSkill}`);
  assert.ok(["read-only", "small", "risk-bearing"].includes(item.expectedRisk), `${item.id} has invalid risk`);
  for (const lens of item.reviewLenses) assert.ok(agents.has(lens), `${item.id} names unknown reviewer ${lens}`);
  for (const id of item.must) assert.match(protocol, new RegExp(`## ${id}\\b`), `${item.id} references undefined ${id}`);
  if (item.expectedRisk === "risk-bearing" && item.expectedSkill === "ps-change") {
    assert.strictEqual(item.requiresCommittedPlan, true, `${item.id} must exercise the risk-bearing plan contract`);
  }
}

console.log("contract corpus passed");
