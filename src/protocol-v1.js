"use strict";

const fs = require("fs");
const path = require("path");
const core = require("./index");

const MODULE_ID = "trivium-lab";
const CANONICAL_REPOSITORY = "Lootziffer666/LAB";

function applyWireIdToHandoffs(handoffs) {
  for (const handoff of Object.values(handoffs)) handoff.module = MODULE_ID;
  if (handoffs.swift?.jobContract) handoffs.swift.jobContract.module = MODULE_ID;
  return handoffs;
}

function createHandoffs(input) {
  return applyWireIdToHandoffs(core.createHandoffs(input));
}

function buildBundle(input) {
  const request = core.normalizeRequest(input);
  return {
    schemaVersion: core.BUNDLE_VERSION,
    module: MODULE_ID,
    moduleVersion: core.MODULE_VERSION,
    canonicalRepository: CANONICAL_REPOSITORY,
    request,
    plan: core.buildPlan(request),
    handoffs: createHandoffs(request),
    invariants: core.buildBundle(request).invariants,
  };
}

function writeBundle(input, outputDir) {
  const bundle = buildBundle(input);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "lab-bundle.json"), `${JSON.stringify(bundle, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "plan.json"), `${JSON.stringify(bundle.plan, null, 2)}\n`);
  const handoffDir = path.join(outputDir, "handoffs");
  fs.mkdirSync(handoffDir, { recursive: true });
  for (const [name, handoff] of Object.entries(bundle.handoffs)) {
    fs.writeFileSync(path.join(handoffDir, `${name}.request.json`), `${JSON.stringify(handoff, null, 2)}\n`);
  }
  return bundle;
}

module.exports = {
  ...core,
  MODULE_ID,
  CANONICAL_REPOSITORY,
  createHandoffs,
  buildBundle,
  writeBundle,
};
