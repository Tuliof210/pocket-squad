#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const resultPath = process.argv[2];
if (!resultPath) {
  process.stderr.write("usage: node test/evals/score.js <results.json>\n");
  process.exit(1);
}

const expected = JSON.parse(fs.readFileSync(path.join(__dirname, "cases.json"), "utf8"));
const actual = JSON.parse(fs.readFileSync(path.resolve(resultPath), "utf8"));
const byId = new Map(actual.map((item) => [item.id, item]));
const sameSet = (left = [], right = []) => left.length === right.length && left.every((value) => right.includes(value));
const ratio = (value, total) => total ? Number((value / total).toFixed(3)) : 0;

const totals = {
  cases: expected.length,
  completed: 0,
  skillRouting: 0,
  riskClassification: 0,
  planDecision: 0,
  reviewSelection: 0,
  protocolHits: 0,
  protocolExpected: 0,
  outputTokens: 0,
  durationMs: 0,
};
const missing = [];

for (const target of expected) {
  const result = byId.get(target.id);
  if (!result) {
    missing.push(target.id);
    totals.protocolExpected += target.must.length;
    continue;
  }
  if (result.completed === true) totals.completed++;
  if (result.selectedSkill === target.expectedSkill) totals.skillRouting++;
  if (result.risk === target.expectedRisk) totals.riskClassification++;
  if (result.committedPlan === target.requiresCommittedPlan) totals.planDecision++;
  if (sameSet(result.reviewLenses, target.reviewLenses)) totals.reviewSelection++;
  totals.protocolExpected += target.must.length;
  totals.protocolHits += target.must.filter((id) => (result.protocols || []).includes(id)).length;
  totals.outputTokens += Number(result.outputTokens || 0);
  totals.durationMs += Number(result.durationMs || 0);
}

const score = {
  cases: totals.cases,
  missing,
  completionRate: ratio(totals.completed, totals.cases),
  skillRoutingAccuracy: ratio(totals.skillRouting, totals.cases),
  riskClassificationAccuracy: ratio(totals.riskClassification, totals.cases),
  planDecisionAccuracy: ratio(totals.planDecision, totals.cases),
  reviewSelectionAccuracy: ratio(totals.reviewSelection, totals.cases),
  protocolRecall: ratio(totals.protocolHits, totals.protocolExpected),
  averageOutputTokens: Math.round(totals.outputTokens / totals.cases),
  averageDurationMs: Math.round(totals.durationMs / totals.cases),
};

process.stdout.write(`${JSON.stringify(score, null, 2)}\n`);
if (missing.length) process.exitCode = 2;
