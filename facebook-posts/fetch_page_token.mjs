#!/usr/bin/env node
import fs from "node:fs";

const userTokenPath = process.env.FACEBOOK_USER_TOKEN_FILE || "facebook-posts/.facebook-user-token";
const envPath = process.env.FACEBOOK_ENV_FILE || "facebook-posts/facebook.env";
const graphVersion = process.env.FACEBOOK_GRAPH_VERSION || "v25.0";

function readEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const existingEnv = readEnv(envPath);
const targetPageId = process.env.FACEBOOK_PAGE_ID || existingEnv.FACEBOOK_PAGE_ID || "1201743546357100";

function readSecret(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing token file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8").trim();
}

async function graphGet(url) {
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(JSON.stringify(json.error || json));
  }
  return json;
}

const userToken = readSecret(userTokenPath);
const pages = [];
let nextUrl = `https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(userToken)}`;

for (let i = 0; nextUrl && i < 20; i += 1) {
  const page = await graphGet(nextUrl);
  pages.push(...(page.data || []));
  nextUrl = page.paging?.next || "";
}

const target = pages.find((page) => page.id === targetPageId);

if (!target?.access_token) {
  const summary = pages.map((page) => ({ id: page.id, name: page.name }));
  console.log(JSON.stringify({ ok: false, targetPageId, page_count: pages.length, pages: summary }, null, 2));
  process.exit(3);
}

let debug = null;
try {
  debug = await graphGet(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(target.access_token)}&access_token=${encodeURIComponent(userToken)}`,
  );
} catch (error) {
  debug = { error: String(error.message || error) };
}

fs.writeFileSync(
  envPath,
  `FACEBOOK_PAGE_ID=${targetPageId}\nFACEBOOK_PAGE_ACCESS_TOKEN=${target.access_token}\n`,
  { mode: 0o600 },
);

console.log(JSON.stringify({
  ok: true,
  id: target.id,
  name: target.name,
  page_count: pages.length,
  scopes: debug?.data?.scopes || [],
  expires_at: debug?.data?.expires_at || null,
}, null, 2));
