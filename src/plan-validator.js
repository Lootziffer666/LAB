"use strict";

const fs = require("fs");

const PLAN_VERSION = "0.1.0";
const PLAN_ROUTES = Object.freeze([
  "native", "bridge", "approximate", "decompose", "reconstruct", "normalize",
  "bake", "project", "degrade", "enrich", "federate", "preserve", "unknown",
]);

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value, label, add, options = {}) {
  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0) || value.some((item) => !nonEmptyString(item))) {
    add(`${label} of non-empty strings is required`);
  }
}

function validatePlan(doc, toolRegistry) {
  const errors = [];
  const add = (message) => errors.push(message);
  if (!isObject(doc)) return { ok: false, errors: ["plan: document object is required"] };
  if (doc.planVersion !== PLAN_VERSION) add(`plan: planVersion must be '${PLAN_VERSION}'`);
  if (!nonEmptyString(doc.id)) add("plan: id is required");
  if (!PLAN_ROUTES.includes(doc.route)) add(`plan ${doc.id || "<unknown>"}: unsupported route`);

  if (!isObject(doc.source)) add(`plan ${doc.id || "<unknown>"}: source object is required`);
  else {
    if (!nonEmptyString(doc.source.artifact)) add(`plan ${doc.id}: source.artifact is required`);
    if (!nonEmptyString(doc.source.contractRef)) add(`plan ${doc.id}: source.contractRef is required`);
  }

  if (!isObject(doc.target)) add(`plan ${doc.id || "<unknown>"}: target object is required`);
  else {
    if (!nonEmptyString(doc.target.runtime)) add(`plan ${doc.id}: target.runtime is required`);
    if (!nonEmptyString(doc.target.form)) add(`plan ${doc.id}: target.form is required`);
  }

  if (!Array.isArray(doc.steps) || doc.steps.length === 0) add(`plan ${doc.id || "<unknown>"}: steps[] is required`);
  else {
    const available = new Set(nonEmptyString(doc.source?.artifact) ? [doc.source.artifact] : []);
    const ids = new Set();
    for (const [index, step] of doc.steps.entries()) {
      if (!isObject(step)) { add(`plan ${doc.id}: steps[${index}] must be an object`); continue; }
      if (!nonEmptyString(step.id)) add(`plan ${doc.id}: steps[${index}].id is required`);
      else if (ids.has(step.id)) add(`plan ${doc.id}: duplicate step id '${step.id}'`);
      else ids.add(step.id);
      if (!nonEmptyString(step.tool)) add(`plan ${doc.id}: step '${step.id || index}'.tool is required`);
      else if (toolRegistry && !toolRegistry.has(step.tool)) add(`plan ${doc.id}: unknown tool '${step.tool}'`);
      if (step.script != null && !nonEmptyString(step.script)) add(`plan ${doc.id}: step '${step.id || index}'.script must be non-empty`);
      stringArray(step.inputs, `plan ${doc.id}: step '${step.id || index}'.inputs[]`, add);
      stringArray(step.produces, `plan ${doc.id}: step '${step.id || index}'.produces[]`, add);
      for (const input of step.inputs || []) if (!available.has(input)) add(`plan ${doc.id}: input '${input}' is not available`);
      for (const output of step.produces || []) available.add(output);
    }
  }

  if (!isObject(doc.verify) || !nonEmptyString(doc.verify.contractRef)) add(`plan ${doc.id || "<unknown>"}: verify.contractRef is required`);
  if (doc.fallbacks != null) stringArray(doc.fallbacks, `plan ${doc.id}: fallbacks[]`, add, { allowEmpty: true });
  return { ok: errors.length === 0, errors };
}

function deepFreeze(value) {
  if (isObject(value) || Array.isArray(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function loadPlan(json, toolRegistry) {
  const doc = typeof json === "string" ? JSON.parse(json) : JSON.parse(JSON.stringify(json));
  const result = validatePlan(doc, toolRegistry);
  if (!result.ok) throw new Error(`loadPlan: ${result.errors.join("; ")}`);
  return deepFreeze(doc);
}

function loadPlanFile(file, toolRegistry) {
  return loadPlan(fs.readFileSync(file, "utf8"), toolRegistry);
}

module.exports = { PLAN_VERSION, PLAN_ROUTES, validatePlan, loadPlan, loadPlanFile };
