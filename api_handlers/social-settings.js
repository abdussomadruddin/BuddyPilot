// Social accounts for Post Pilot publishing (signed-in owner only). Tokens are
// accepted, tested and stored encrypted; they are never sent back.
const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/http-body");
const credentials = require("../lib/social-credentials");
const social = require("../lib/social-publish");

const PLATFORM = { facebook_page: social.facebookPage, threads: social.threads };

function send(res, status, body) {
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    requireAuth(req);
    if (req.method === "GET") return send(res, 200, { ok: true, social: await credentials.socialStatus() });
    if (req.method !== "POST") return send(res, 405, { ok: false, error: "Method not allowed." });
    if (req.headers["sec-fetch-site"] === "cross-site" || !/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return send(res, 403, { ok: false, error: "Request tidak dibenarkan." });
    const body = await readJsonBody(req);
    if (body.action === "extension-token") return send(res, 200, { ok: true, ...await credentials.createExtensionToken(), social: await credentials.socialStatus() });
    if (body.action !== "save" || !PLATFORM[body.provider]) throw Object.assign(new Error("Tindakan tidak sah."), { statusCode: 400 });
    // A token is saved only after the platform accepts it.
    const account = { token: String(body.token || "").trim(), accountId: String(body.accountId || "").trim() };
    await credentials.saveSocial(body.provider, account, dryRunDeps());
    const test = await PLATFORM[body.provider].test(account);
    return send(res, 200, { ok: true, message: test.message, social: await credentials.saveSocial(body.provider, account) });
  } catch (error) {
    const status = error.statusCode === 401 ? 401 : error.statusCode && error.statusCode < 500 ? error.statusCode : 400;
    const safe = error.statusCode || /^(Masukkan token|ID akaun|Token |Facebook|Threads|Platform|Tindakan)/.test(error.message || "");
    return send(res, status, { ok: false, code: error.code || "", error: status === 401 ? "Unauthorized." : safe ? error.message : "Tetapan akaun sosial tidak tersedia. Semak migration dan konfigurasi server." });
  }
};

// Validates the token and ID format without writing anything.
function dryRunDeps() {
  return { request: async () => [], encrypt: () => "", decrypt: () => "{}", env: {} };
}
