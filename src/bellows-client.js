"use strict";

const fs = require("fs");
const path = require("path");

const VISION_DETAILS = new Set(["auto", "low", "high"]);
const MIME_BY_EXTENSION = Object.freeze({
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
});

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveBellowsConfig(gateway, env = process.env) {
  if (!gateway || gateway.gateway !== "bellows") throw new Error("LAB model calls require the BELLOWS gateway");
  const baseUrlName = gateway.baseUrlEnv || "BELLOWS_BASE_URL";
  const apiKeyName = gateway.apiKeyEnv || "BELLOWS_API_KEY";
  const modelName = gateway.modelEnv || "BELLOWS_MODEL";
  const baseUrl = env[baseUrlName];
  const apiKey = env[apiKeyName];
  const model = env[modelName];
  const missing = [];
  if (!nonEmpty(baseUrl)) missing.push(baseUrlName);
  if (!nonEmpty(apiKey)) missing.push(apiKeyName);
  if (!nonEmpty(model)) missing.push(modelName);
  if (missing.length) throw new Error(`BELLOWS configuration missing: ${missing.join(", ")}`);
  return {
    endpoint: `${baseUrl.replace(/\/$/, "")}${gateway.endpointPath || "/v1/chat/completions"}`,
    apiKey,
    model,
  };
}

function normalizeContentPart(part, messageIndex, partIndex) {
  if (!part || typeof part !== "object" || Array.isArray(part)) {
    throw new Error(`BELLOWS message ${messageIndex} content part ${partIndex} must be an object`);
  }
  if (part.type === "text") {
    if (!nonEmpty(part.text)) throw new Error(`BELLOWS message ${messageIndex} text part ${partIndex} requires text`);
    return { type: "text", text: part.text };
  }
  if (part.type === "image_url") {
    const image = part.image_url;
    if (!image || typeof image !== "object" || !nonEmpty(image.url)) {
      throw new Error(`BELLOWS message ${messageIndex} image part ${partIndex} requires image_url.url`);
    }
    if (image.detail !== undefined && !VISION_DETAILS.has(image.detail)) {
      throw new Error(`BELLOWS image detail must be one of ${[...VISION_DETAILS].join(", ")}`);
    }
    return {
      type: "image_url",
      image_url: { url: image.url, ...(image.detail ? { detail: image.detail } : {}) },
    };
  }
  throw new Error(`Unsupported BELLOWS content part '${part.type}'`);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) throw new Error("BELLOWS messages are required");
  return messages.map((message, messageIndex) => {
    if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error(`BELLOWS message ${messageIndex} must be an object`);
    if (!nonEmpty(message.role)) throw new Error(`BELLOWS message ${messageIndex} requires role`);
    if (typeof message.content === "string" && nonEmpty(message.content)) return { role: message.role, content: message.content };
    if (Array.isArray(message.content) && message.content.length > 0) {
      return {
        role: message.role,
        content: message.content.map((part, partIndex) => normalizeContentPart(part, messageIndex, partIndex)),
      };
    }
    throw new Error(`BELLOWS message ${messageIndex} content must be text or content parts`);
  });
}

function inferImageMimeType(filePath) {
  const mimeType = MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()];
  if (!mimeType) throw new Error(`Unsupported vision image extension: ${path.extname(filePath) || "<none>"}`);
  return mimeType;
}

function imageFileToDataUrl(filePath, mimeType = inferImageMimeType(filePath)) {
  return `data:${mimeType};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function createVisionMessage({ role = "user", text, imageUrl, imagePath, detail = "auto" }) {
  if (!nonEmpty(role)) throw new Error("Vision message role is required");
  if (!!imageUrl === !!imagePath) throw new Error("Vision message requires exactly one of imageUrl or imagePath");
  if (!VISION_DETAILS.has(detail)) throw new Error(`Vision detail must be one of ${[...VISION_DETAILS].join(", ")}`);
  const url = imagePath ? imageFileToDataUrl(imagePath) : imageUrl;
  const content = [];
  if (nonEmpty(text)) content.push({ type: "text", text });
  content.push({ type: "image_url", image_url: { url, detail } });
  return { role, content };
}

async function callBellows(gateway, messages, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A Fetch API implementation is required");
  const config = resolveBellowsConfig(gateway, options.env || process.env);
  const response = await fetchImpl(config.endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model || config.model,
      messages: normalizeMessages(messages),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: false,
    }),
  });
  if (!response.ok) throw new Error(`BELLOWS request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!nonEmpty(content)) throw new Error("BELLOWS returned no assistant content");
  return { content, response: payload };
}

function callBellowsVision(gateway, visionInput, options = {}) {
  return callBellows(gateway, [createVisionMessage(visionInput)], options);
}

module.exports = {
  VISION_DETAILS,
  resolveBellowsConfig,
  normalizeMessages,
  inferImageMimeType,
  imageFileToDataUrl,
  createVisionMessage,
  callBellows,
  callBellowsVision,
};
