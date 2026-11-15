// The BuddyPilot Chrome extension talks to this endpoint only. It is paired
// with a token generated in Settings, and can do three things: read the posts
// queued for personal Facebook, mark one as posted, and send back engagement
// it read from the owner's own profile. It cannot read tokens, drafts that are
// not queued, or anything else in BuddyPilot.
const { readJsonBody } = require("../lib/http-body");
const { verifyExtensionToken } = require("../lib/social-credentials");
const { createStore } = require("../lib/storytelling");
const publish = require("../lib/storytelling-publish");

function send(res, status, body) {
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

async function dispatch(store, { method, body = {} }) {
  if (method === "GET") return publish.extensionQueue(store);
  if (body.action === "done") return publish.extensionDone(store, body);
  if (body.action === "sync") return publish.extensionSync(store, body);
  throw Object.assign(new Error("Tindakan tidak sah."), { statusCode: 400 });
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!await verifyExtensionToken(token)) return send(res, 401, { ok: false, error: "Token extension tidak sah. Jana token baru di BuddyPilot > Post Pilot > Tetapan." });
    if (!["GET", "POST"].includes(req.method)) return send(res, 405, { ok: false, error: "Method not allowed." });
    const body = req.method === "POST" ? await readJsonBody(req) : {};
    return send(res, 200, { ok: true, ...await dispatch(createStore(), { method: req.method, body }) });
  } catch (error) {
    if (!error.statusCode || error.statusCode >= 500) console.error("storytelling_extension_error", { message: String(error?.message || error).slice(0, 200) });
    return send(res, error.statusCode || 500, { ok: false, code: error.code || "", error: error.statusCode ? error.message : "BuddyPilot tidak dapat memproses permintaan." });
  }
};

module.exports.dispatch = dispatch;
